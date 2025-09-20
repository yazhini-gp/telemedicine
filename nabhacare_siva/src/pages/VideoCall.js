import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { db } from '../services/firebase';
import {
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  collection,
  addDoc,
  getDocs,
  deleteDoc
} from 'firebase/firestore';

const STUN_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }];

const VideoCall = () => {
  const { consultationId } = useParams();
  const navigate = useNavigate();
  const { userProfile } = useAuth();

  // Quick switch to use Jitsi Meet instead of custom WebRTC
  const USE_JITSI = true;
  // Force meet.jit.si to allow guest rooms without a moderator
  const JITSI_DOMAIN = 'meet.jit.si';
  const JITSI_TENANT = process.env.REACT_APP_JITSI_TENANT || 'NabhaCare'; // only used for 8x8.vc
  const jitsiRoom = `consult-${consultationId}`;
  // For 8x8.vc, the room name includes tenant prefix: <tenant>/<room>
  const jitsiRoomName = JITSI_DOMAIN === '8x8.vc' ? `${JITSI_TENANT}/${jitsiRoom}` : jitsiRoom;
  const [roomName, setRoomName] = useState(jitsiRoomName);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const jitsiContainerRef = useRef(null);
  const jitsiApiRef = useRef(null);
  const sessionUnsubRef = useRef(null);
  const candidatesUnsubRef = useRef(null);
  const isClosedRef = useRef(false);
  const hasCreatedOfferRef = useRef(false);
  const hasSetRemoteOfferRef = useRef(false);
  const hasCreatedAnswerRef = useRef(false);
  const pendingRemoteCandidatesRef = useRef([]);

  const [role, setRole] = useState('callee');
  const [connecting, setConnecting] = useState(true);

  useEffect(() => {
    if (USE_JITSI) {
      // Load Jitsi external API script if not present
      const ensureScript = () => new Promise((resolve, reject) => {
        if (window.JitsiMeetExternalAPI) return resolve();
        const script = document.createElement('script');
        script.src = `https://${JITSI_DOMAIN}/external_api.js`;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Jitsi external API'));
        document.body.appendChild(script);
      });

      (async () => {
        try {
          await ensureScript();
          if (!jitsiContainerRef.current) return;
          // Fetch consultation to see if a roomKey exists
          try {
            const cRef = doc(db, 'consultations', consultationId);
            const cSnap = await getDoc(cRef);
            const cData = cSnap.data();
            if (cData?.roomKey) {
              const base = (JITSI_DOMAIN === '8x8.vc') ? `${JITSI_TENANT}/consult-${consultationId}-${cData.roomKey}` : `consult-${consultationId}-${cData.roomKey}`;
              setRoomName(base);
            }
          } catch {}
          const domain = JITSI_DOMAIN;
          try { console.log('Initializing Jitsi on domain:', domain, 'room:', roomName); } catch {}
          const options = {
            roomName,
            parentNode: jitsiContainerRef.current,
            userInfo: { displayName: userProfile?.name || 'Guest' },
            configOverwrite: {
              prejoinPageEnabled: false,
              startWithAudioMuted: false,
              startWithVideoMuted: false,
              disableDeepLinking: true,
              enableWelcomePage: false,
              enableClosePage: true,
              enableUserRolesBasedOnToken: false
            },
            interfaceConfigOverwrite: {
              MOBILE_APP_PROMO: false
            }
          };
          jitsiApiRef.current = new window.JitsiMeetExternalAPI(domain, options);
        } catch (e) {
          console.error('Failed to initialize Jitsi', e);
        } finally {
          setConnecting(false);
        }
      })();

      return () => {
        try { jitsiApiRef.current?.dispose?.(); } catch {}
      };
    }
    (async () => {
      // Determine role synchronously for signaling labels
      // Patient initiates the call (caller), doctor answers (callee)
      const isPatient = userProfile?.role === 'patient';
      const selfRole = isPatient ? 'caller' : 'callee';
      setRole(selfRole);

      // Get media
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      const pc = new RTCPeerConnection({ iceServers: STUN_SERVERS });
      pcRef.current = pc;
      isClosedRef.current = false;
      hasCreatedOfferRef.current = false;
      hasSetRemoteOfferRef.current = false;
      hasCreatedAnswerRef.current = false;

      // Attach local tracks
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      // Remote stream
      const remoteStream = new MediaStream();
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
      pc.ontrack = (event) => {
        event.streams[0].getTracks().forEach(track => remoteStream.addTrack(track));
      };

      // Set up ICE handling
      const candidatesCol = collection(db, 'consultations', consultationId, 'callCandidates');
      pc.onicecandidate = async (event) => {
        if (event.candidate) {
          await addDoc(candidatesCol, {
            from: selfRole,
            candidate: event.candidate.toJSON(),
            createdAt: Date.now()
          });
        }
      };

      const sessionRef = doc(db, 'consultations', consultationId, 'call', 'session');

      if (isPatient) {
        // Caller flow
        if (!pc.localDescription && !hasCreatedOfferRef.current) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
          hasCreatedOfferRef.current = true;
        await setDoc(sessionRef, { offer, createdBy: userProfile.id }, { merge: true });
        }

        // Listen for answer
        sessionUnsubRef.current = onSnapshot(sessionRef, async (snap) => {
          if (!snap.exists()) return;
          const data = snap.data();
          if (isClosedRef.current || pc.signalingState === 'closed') return;
          if (data?.answer && !pc.currentRemoteDescription) {
            try {
            await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
              // Drain any pending remote candidates gathered before remoteDescription
              const queued = pendingRemoteCandidatesRef.current.splice(0);
              for (const c of queued) {
                try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch (err) { console.error('Error adding queued candidate', err); }
              }
            } catch (e) {
              console.error('Error setting remote answer', e);
            }
          }
        });
      } else {
        // Callee flow: listen for offer in realtime, then answer
        sessionUnsubRef.current = onSnapshot(sessionRef, async (snap) => {
          if (!snap.exists()) return;
          const data = snap.data();
          if (isClosedRef.current || pc.signalingState === 'closed') return;
          if (data?.offer && !pc.currentRemoteDescription && !hasSetRemoteOfferRef.current) {
            try {
            await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
              hasSetRemoteOfferRef.current = true;
              // Drain any pending remote candidates gathered before remoteDescription
              const queued = pendingRemoteCandidatesRef.current.splice(0);
              for (const c of queued) {
                try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch (err) { console.error('Error adding queued candidate', err); }
              }
            } catch (e) {
              console.error('Error setting remote offer', e);
              return;
            }
          }
          if (pc.remoteDescription && !pc.localDescription && !hasCreatedAnswerRef.current) {
            try {
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
              hasCreatedAnswerRef.current = true;
            await setDoc(sessionRef, { answer }, { merge: true });
            } catch (e) {
              console.error('Error creating/setting local answer', e);
            }
          }
        });
      }

      // Listen for ICE candidates from the other side
      // Listen to all candidates and ignore our own. Buffer until remoteDescription is set
      candidatesUnsubRef.current = onSnapshot(candidatesCol, (snap) => {
        snap.docChanges().forEach(async (change) => {
          const data = change.doc.data();
          if (!data || data.from === selfRole) return;
          if (data.candidate) {
            try {
              if (isClosedRef.current || pc.signalingState === 'closed') return;
              if (!pc.remoteDescription) {
                // Queue until we have set the remote description
                pendingRemoteCandidatesRef.current.push(data.candidate);
                return;
              }
              await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
            } catch (err) {
              console.error('Error adding ice candidate', err);
            }
          }
        });
      });

      setConnecting(false);
    })();

    return () => {
      // Cleanup
      try {
        isClosedRef.current = true;
        localStreamRef.current?.getTracks().forEach(t => t.stop());
        pcRef.current?.close();
        if (sessionUnsubRef.current) sessionUnsubRef.current();
        if (candidatesUnsubRef.current) candidatesUnsubRef.current();
      } catch {}
    };
  }, [consultationId, userProfile, roomName, JITSI_TENANT, USE_JITSI]);

  const handleLeave = async () => {
    try {
      localStreamRef.current?.getTracks().forEach(t => t.stop());
      pcRef.current?.close();
      // Optional: delete signaling to keep tidy
      const sessionRef = doc(db, 'consultations', consultationId, 'call', 'session');
      const candidatesCol = collection(db, 'consultations', consultationId, 'callCandidates');
      const candSnap = await getDocs(candidatesCol);
      await Promise.all(candSnap.docs.map(d => deleteDoc(d.ref)));
      await setDoc(sessionRef, { endedAt: Date.now() }, { merge: true });
    } finally {
      // Prevent immediate auto-redirect back into the call on the patient side
      try {
        sessionStorage.setItem(`suppressCallRedirect:${consultationId}`, String(Date.now()));
      } catch {}
      navigate('/consultations');
    }
  };

  const handleLeaveJitsi = async () => {
    console.log('Leave button clicked, consultationId:', consultationId);
    try {
      // Hang up and dispose Jitsi instance
      try { 
        console.log('Attempting to hangup Jitsi...');
        jitsiApiRef.current?.executeCommand?.('hangup'); 
      } catch (e) {
        console.error('Error hanging up Jitsi:', e);
      }
      try { 
        console.log('Attempting to dispose Jitsi...');
        jitsiApiRef.current?.dispose?.(); 
      } catch (e) {
        console.error('Error disposing Jitsi:', e);
      }

      // Mark consultation as completed when call ends
      console.log('Updating consultation status to completed...');
      const consultationRef = doc(db, 'consultations', consultationId);
      await setDoc(consultationRef, { 
        status: 'completed',
        endedAt: Date.now() 
      }, { merge: true });
      console.log('Consultation status updated successfully');
    } catch (error) {
      console.error('Error in handleLeaveJitsi:', error);
    } finally {
      try {
        sessionStorage.setItem(`suppressCallRedirect:${consultationId}`, String(Date.now()));
      } catch {}
      console.log('Navigating back to consultations...');
      navigate('/consultations');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Video Consultation</h1>
        <button 
          onClick={() => {
            console.log('Leave button clicked!');
            if (USE_JITSI) {
              handleLeaveJitsi();
            } else {
              handleLeave();
            }
          }} 
          className="btn-secondary"
        >
          Leave
        </button>
      </div>

      {USE_JITSI ? (
        <div className="card p-2">
          <div ref={jitsiContainerRef} style={{ width: '100%', height: '70vh', borderRadius: '0.5rem', overflow: 'hidden' }} />
        </div>
      ) : (
        <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card p-2">
          <p className="text-sm text-gray-500 mb-2">You</p>
          <video ref={localVideoRef} autoPlay playsInline muted className="w-full rounded" />
        </div>
        <div className="card p-2">
          <p className="text-sm text-gray-500 mb-2">Doctor/Patient</p>
          <video ref={remoteVideoRef} autoPlay playsInline className="w-full rounded" />
        </div>
      </div>

      {connecting && (
        <div className="text-gray-600 dark:text-gray-400">Connecting…</div>
          )}
        </>
      )}
    </div>
  );
};

export default VideoCall;