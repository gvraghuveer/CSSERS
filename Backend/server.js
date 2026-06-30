import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import twilio from 'twilio';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.send('CrimeShield Emergency Response System Backend is active and running.');
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3001;

// In-Memory Device Registry
const devices = new Map();

// Helper to determine cleaner sender IP
const getClientIp = (req) => {
  let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
  if (ip.includes(',')) {
    ip = ip.split(',')[0].trim();
  }
  if (ip.startsWith('::ffff:')) {
    ip = ip.substring(7);
  }
  return ip;
};

// Real-time call tracking state
let callState = {
  active: false,
  status: 'idle', // 'idle', 'initiating', 'calling', 'ringing', 'connected', 'disconnected', 'rejected', 'failed'
  timer: 0,
  pole: null,
  latitude: null,
  longitude: null,
  responder: null
};

// Twilio Config
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;
const toNumber = process.env.EMERGENCY_CONTACT;

// Resolved Emergency Responders Hunt Group
const contacts = [
  { name: 'Ambulance', number: process.env.EMERGENCY_CONTACT_AMBULANCE || process.env.EMERGENCY_CONTACT },
  { name: 'Police', number: process.env.EMERGENCY_CONTACT_POLICE || '' },
  { name: 'Developer', number: process.env.EMERGENCY_CONTACT_DEV || '' }
];

let activeCalls = {}; // Tracks CallSid -> { name, number, status }

let twilioClient = null;
const isTwilioConfigured = accountSid && authToken && fromNumber && contacts.some(c => c.number) && 
                           !accountSid.includes('ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX') &&
                           !authToken.includes('your_twilio_auth_token');

if (isTwilioConfigured) {
  try {
    twilioClient = twilio(accountSid, authToken);
    console.log('[CrimeShield] Twilio client successfully initialized.');
  } catch (error) {
    console.error('[CrimeShield] Failed to initialize Twilio client:', error);
  }
} else {
  console.log('[CrimeShield] Twilio credentials not configured. Running in MOCK CALL mode.');
}

// Socket Connection handling
io.on('connection', (socket) => {
  console.log('[CrimeShield] Dashboard client connected to socket:', socket.id);
  // Send current state to newly connected dashboard
  socket.emit('call_state', callState);

  socket.on('disconnect', () => {
    console.log('[CrimeShield] Dashboard client disconnected:', socket.id);
  });
});

// Trigger Twilio emergency voice call
app.post('/api/start-call', async (req, res) => {
  const { pole, latitude, longitude } = req.body;

  if (!pole) {
    return res.status(400).json({ error: 'Missing required parameter: pole' });
  }

  // Prevent duplicate calls
  if (callState.active) {
    return res.status(400).json({ error: 'An emergency call is already active or in progress' });
  }

  // Parse default/fallback coordinates safely
  const parsedLat = Number(latitude);
  const parsedLng = Number(longitude);
  let finalLat = isNaN(parsedLat) || latitude === null ? 0 : parsedLat;
  let finalLng = isNaN(parsedLng) || longitude === null ? 0 : parsedLng;
  const finalPole = pole;

  console.log(`[CrimeShield] Initiating call for ${finalPole}. Fallback Coordinates (Lat: ${finalLat}, Lng: ${finalLng})`);

  // Query Supabase for the latest valid GPS coordinates if configured and not supplied in the request
  const hasValidCoords = (finalLat !== 0 && finalLng !== 0);
  if (!hasValidCoords && process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
    try {
      const supabaseQueryUrl = `${process.env.SUPABASE_URL}/rest/v1/events?select=latitude,longitude&order=created_at.desc&limit=5`;
      console.log(`[CrimeShield] Querying Supabase events: ${supabaseQueryUrl}`);
      const response = await fetch(supabaseQueryUrl, {
        method: 'GET',
        headers: {
          'apikey': process.env.SUPABASE_KEY,
          'Authorization': `Bearer ${process.env.SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });

      if (response.ok) {
        const eventsList = await response.json();
        if (Array.isArray(eventsList)) {
          const validEvent = eventsList.find(e => {
            const latVal = Number(e.latitude);
            const lngVal = Number(e.longitude);
            return !isNaN(latVal) && latVal !== 0 && !isNaN(lngVal) && lngVal !== 0;
          });

          if (validEvent) {
            finalLat = Number(validEvent.latitude);
            finalLng = Number(validEvent.longitude);
            console.log(`[CrimeShield] Dynamic GPS Coords resolved from Supabase: Lat ${finalLat}, Lng ${finalLng}`);
          } else {
            console.log('[CrimeShield] No events with valid non-zero GPS coordinates found in the latest 5 Supabase events. Using fallback.');
          }
        }
      } else {
        console.error(`[CrimeShield] Supabase REST API returned error status: ${response.status} ${response.statusText}`);
      }
    } catch (err) {
      console.error('[CrimeShield] Error fetching coordinates from Supabase events:', err);
    }
  } else {
    console.log('[CrimeShield] Supabase URL/Key not configured. Skipping database coordinate lookup.');
  }

  console.log(`[CrimeShield] Triggering emergency response for ${finalPole} using Lat: ${finalLat}, Lng: ${finalLng}`);

  callState = {
    active: true,
    status: 'initiating',
    timer: 0,
    pole: finalPole,
    latitude: finalLat,
    longitude: finalLng
  };
  io.emit('call_state', callState);

  if (isTwilioConfigured && twilioClient) {
    try {
      const rawPublicUrl = process.env.PUBLIC_URL || '';
      const publicUrl = rawPublicUrl.replace(/\/$/, '');

      // Resolve active responders list (de-duplicated)
      const targetResponders = [];
      const seenNumbers = new Set();
      for (const c of contacts) {
        const cleanNum = c.number ? c.number.trim() : '';
        if (cleanNum && !seenNumbers.has(cleanNum)) {
          seenNumbers.add(cleanNum);
          targetResponders.push({ name: c.name, number: cleanNum });
        }
      }

      if (targetResponders.length === 0 && toNumber) {
        targetResponders.push({ name: 'Emergency Dispatch', number: toNumber.trim() });
      }

      activeCalls = {};
      callState.responder = null;

      // 1. Send SMS to all responders automatically in the background
      const googleMapsLink = `https://maps.google.com/?q=${finalLat},${finalLng}`;
      const messageBody = `CrimeShield ALERT: Emergency reported at ${finalPole}.\nLocation: ${googleMapsLink}`;

      for (const responder of targetResponders) {
        twilioClient.messages.create({
          body: messageBody,
          to: responder.number,
          from: fromNumber
        }).then(msg => {
          console.log(`[CrimeShield] SMS sent to ${responder.name} (${responder.number}). SID: ${msg.sid}`);
        }).catch(err => {
          console.error(`[CrimeShield] SMS to ${responder.name} failed:`, err);
        });
      }

      // 2. Place calls to all unique responders in parallel
      const callPromises = targetResponders.map(async (responder) => {
        // Build customized TwiML
        const twiml = `
          <Response>
            <Say voice="alice" loop="2">
              Crime Shield Emergency Dispatch Alert. 
              This is an urgent call for the ${responder.name} team. 
              An emergency alert has been triggered at ${finalPole}. 
              Location coordinates: latitude ${finalLat.toFixed(6)}, longitude ${finalLng.toFixed(6)}. 
              A text message with the Google Maps link has been sent to your phone.
              Please check the dispatch dashboard immediately.
            </Say>
          </Response>
        `;

        const callParams = {
          twiml,
          to: responder.number,
          from: fromNumber
        };

        if (publicUrl) {
          callParams.statusCallback = `${publicUrl}/api/twilio/call-status`;
          callParams.statusCallbackEvent = ['initiated', 'ringing', 'answered', 'completed'];
          callParams.statusCallbackMethod = 'POST';
        }

        try {
          const call = await twilioClient.calls.create(callParams);
          console.log(`[CrimeShield] Call created for ${responder.name} (${responder.number}). SID: ${call.sid}`);
          activeCalls[call.sid] = {
            name: responder.name,
            number: responder.number,
            status: 'initiated'
          };
          return call.sid;
        } catch (err) {
          console.error(`[CrimeShield] Failed to call ${responder.name} (${responder.number}):`, err.message);
          return null;
        }
      });

      const sids = await Promise.all(callPromises);
      const activeSids = sids.filter(sid => sid !== null);

      if (activeSids.length === 0) {
        throw new Error('All outbound Twilio calls failed to initiate.');
      }

      callState.status = 'ringing';
      io.emit('call_state', callState);

      // Fallback transition if no publicUrl is configured
      if (!publicUrl) {
        setTimeout(() => {
          if (callState.active && callState.status === 'ringing') {
            callState.status = 'connected';
            callState.responder = targetResponders[0].name;
            io.emit('call_state', callState);
          }
        }, 3500);
      }

      return res.json({ success: true, callSids: activeSids });
    } catch (error) {
      console.error('[CrimeShield] Twilio Voice calls failed:', error);
      callState.status = 'disconnected';
      callState.active = false;
      io.emit('call_state', callState);
      return res.status(500).json({ error: 'Twilio calls failed to place', details: error.message });
    }
  } else {
    // MOCK CALL SIMULATION (runs if environment variables are not filled in)
    res.json({ success: true, message: 'Mock call started' });

    // Transition through stages to simulate active calling flow
    setTimeout(() => {
      if (!callState.active) return;
      callState.status = 'calling';
      io.emit('call_state', callState);

      setTimeout(() => {
        if (!callState.active) return;
        callState.status = 'ringing';
        io.emit('call_state', callState);

        setTimeout(() => {
          if (!callState.active) return;
          callState.status = 'connected';
          callState.responder = 'Ambulance';
          io.emit('call_state', callState);
        }, 3000);
      }, 2000);
    }, 1500);
  }
});

// End call endpoint
app.post('/api/end-call', (req, res) => {
  console.log('[CrimeShield] Ending active emergency call(s)');

  // Terminate any active Twilio calls
  if (isTwilioConfigured && twilioClient) {
    for (const sid in activeCalls) {
      if (['initiated', 'ringing', 'queued', 'answered', 'in-progress'].includes(activeCalls[sid].status)) {
        console.log(`[CrimeShield] Terminating call ${sid} to ${activeCalls[sid].name} via API.`);
        twilioClient.calls(sid).update({ status: 'completed' })
          .catch(err => console.error(`[CrimeShield] Error terminating call ${sid}:`, err.message));
      }
    }
  }

  callState = {
    active: false,
    status: 'idle',
    timer: 0,
    pole: null,
    latitude: null,
    longitude: null,
    responder: null
  };
  activeCalls = {};
  io.emit('call_state', callState);
  res.json({ success: true });
});

// GET call state endpoint for ESP32 Controller self-clearing
app.get('/api/call-state', (req, res) => {
  res.json({ active: callState.active });
});

// Twilio DTMF callback for key press selection
app.post('/api/twilio/gather-input', async (req, res) => {
  const { pole, lat, lng } = req.query;
  const digits = req.body.Digits;

  console.log(`[CrimeShield] Twilio Gather Callback received. Digits pressed: ${digits} for ${pole} (Lat: ${lat}, Lng: ${lng})`);

  let responseTwiml = '';

  if (digits === '1') {
    if (isTwilioConfigured && twilioClient) {
      try {
        const googleMapsLink = `https://maps.google.com/?q=${lat},${lng}`;
        const messageBody = `CrimeShield ALERT: Emergency reported at ${pole}.\nLocation: ${googleMapsLink}`;

        const message = await twilioClient.messages.create({
          body: messageBody,
          to: toNumber,
          from: fromNumber
        });

        console.log(`[CrimeShield] SMS sent successfully. Message SID: ${message.sid}`);
        responseTwiml = `
          <Response>
            <Say voice="alice">Location details have been sent to your phone. Thank you.</Say>
          </Response>
        `;
      } catch (error) {
        console.error('[CrimeShield] Failed to send SMS:', error);
        responseTwiml = `
          <Response>
            <Say voice="alice">Error sending location SMS. Please check the dashboard.</Say>
          </Response>
        `;
      }
    } else {
      console.log('[CrimeShield] Mock Mode: SMS sending simulated.');
      responseTwiml = `
        <Response>
          <Say voice="alice">Mock Mode: Location details simulated as sent. Thank you.</Say>
        </Response>
      `;
    }
  } else {
    responseTwiml = `
      <Response>
        <Say voice="alice">No action taken. Goodbye.</Say>
      </Response>
    `;
  }

  res.type('text/xml');
  res.send(responseTwiml);
});

// Twilio Call Status callback
app.post('/api/twilio/call-status', (req, res) => {
  const callStatus = req.body.CallStatus;
  const callSid = req.body.CallSid;
  const toNum = req.body.To;

  console.log(`[CrimeShield] Twilio Call Status Update: SID=${callSid}, To=${toNum}, Status=${callStatus}`);

  const resetCallState = () => {
    callState = {
      active: false,
      status: 'idle',
      timer: 0,
      pole: null,
      latitude: null,
      longitude: null,
      responder: null
    };
    activeCalls = {};
    io.emit('call_state', callState);
  };

  const triggerSafetyTimeout = () => {
    setTimeout(() => {
      if (callState.active && (callState.status === 'rejected' || callState.status === 'failed')) {
        console.log('[CrimeShield] Safety timeout: Resetting rejected/failed call state to idle.');
        resetCallState();
      }
    }, 8000);
  };

  // If this call is tracked in activeCalls, update its status
  if (activeCalls[callSid]) {
    activeCalls[callSid].status = callStatus;
    const responderName = activeCalls[callSid].name;

    if (callStatus === 'answered' || callStatus === 'in-progress') {
      console.log(`[CrimeShield] Call answered by: ${responderName}`);
      callState.status = 'connected';
      callState.responder = responderName;
      io.emit('call_state', callState);

      // Cancel all OTHER active calls that are still ringing
      for (const otherSid in activeCalls) {
        if (otherSid !== callSid && ['initiated', 'ringing', 'queued'].includes(activeCalls[otherSid].status)) {
          console.log(`[CrimeShield] Responder ${responderName} answered. Canceling call to ${activeCalls[otherSid].name} (${activeCalls[otherSid].number}).`);
          twilioClient.calls(otherSid).update({ status: 'completed' })
            .catch(err => console.error(`[CrimeShield] Error canceling call ${otherSid}:`, err.message));
          activeCalls[otherSid].status = 'canceled';
        }
      }
    } else if (['busy', 'no-answer', 'failed', 'completed', 'canceled'].includes(callStatus)) {
      // If the currently connected responder hung up, end the entire session
      if (callState.status === 'connected' && callState.responder === responderName) {
        console.log(`[CrimeShield] Connected responder ${responderName} disconnected. Resetting state.`);
        resetCallState();
        return res.sendStatus(200);
      }

      // Check if ALL calls are now finished/failed and none answered
      const sids = Object.keys(activeCalls);
      const allDone = sids.every(sid => 
        ['busy', 'no-answer', 'failed', 'completed', 'canceled'].includes(activeCalls[sid].status)
      );

      if (allDone && callState.status !== 'connected') {
        const hasRejections = sids.some(sid => ['busy', 'no-answer'].includes(activeCalls[sid].status));
        callState.status = hasRejections ? 'rejected' : 'failed';
        callState.active = true;
        io.emit('call_state', callState);
        triggerSafetyTimeout();
      }
    } else if (callStatus === 'ringing' && callState.status !== 'connected') {
      callState.status = 'ringing';
      io.emit('call_state', callState);
    }
  } else {
    // Single call mode fallback
    if (callStatus === 'busy' || callStatus === 'no-answer') {
      callState.status = 'rejected';
      callState.active = true;
      io.emit('call_state', callState);
      triggerSafetyTimeout();
    } else if (callStatus === 'failed') {
      callState.status = 'failed';
      callState.active = true;
      io.emit('call_state', callState);
      triggerSafetyTimeout();
    } else if (callStatus === 'completed' || callStatus === 'canceled') {
      resetCallState();
    } else if (callStatus === 'answered' || callStatus === 'in-progress') {
      callState.status = 'connected';
      io.emit('call_state', callState);
    } else if (callStatus === 'ringing') {
      callState.status = 'ringing';
      io.emit('call_state', callState);
    }
  }

  res.sendStatus(200);
});

// Periodic call timer trigger (every 1 second)
setInterval(() => {
  if (callState.active && callState.status === 'connected') {
    callState.timer += 1;
    io.emit('call_timer', callState.timer);
  }
}, 1000);

// ============================================================================
// DEVICE REGISTRY ROUTES
// ============================================================================

// 1. POST /api/device/register
app.post('/api/device/register', (req, res) => {
  const { deviceId, deviceType, mac } = req.body;
  if (!deviceId || !deviceType || !mac) {
    return res.status(400).json({ error: 'Missing required parameters: deviceId, deviceType, mac' });
  }

  const ip = req.body.ip || getClientIp(req);
  const now = Date.now();

  const deviceData = {
    deviceId,
    deviceType,
    mac,
    ip,
    status: 'ONLINE',
    lastSeen: now
  };

  devices.set(deviceId, deviceData);

  console.log(`\n[DEVICE REGISTERED]\n\nDevice: ${deviceId}\nType: ${deviceType}\nIP: ${ip}\nMAC: ${mac}\n`);

  res.json({ success: true });
});

// 2. POST /api/device/heartbeat
app.post('/api/device/heartbeat', (req, res) => {
  const { deviceId } = req.body;
  if (!deviceId) {
    return res.status(400).json({ error: 'Missing required parameter: deviceId' });
  }

  const ip = req.body.ip || getClientIp(req);
  const now = Date.now();

  let existing = devices.get(deviceId);
  if (!existing) {
    // Self-healing fallback: If server restarted and lost volatile memory, register it dynamically
    const inferredType = deviceId.toLowerCase().includes('camera') ? 'camera' : 'controller';
    existing = {
      deviceId,
      deviceType: inferredType,
      mac: 'UNKNOWN',
      ip,
      status: 'ONLINE',
      lastSeen: now
    };
    devices.set(deviceId, existing);
    console.log(`\n[DEVICE REGISTERED (via Heartbeat)]\n\nDevice: ${deviceId}\nType: ${inferredType}\nIP: ${ip}\nMAC: UNKNOWN\n`);
  } else {
    existing.ip = ip;
    existing.status = 'ONLINE';
    existing.lastSeen = now;
    devices.set(deviceId, existing);
    console.log(`\n[HEARTBEAT]\n\nDevice: ${deviceId}\nIP: ${ip}\n`);
  }

  res.json({ success: true });
});

// 3. GET /api/device/:deviceId
app.get('/api/device/:deviceId', (req, res) => {
  const { deviceId } = req.params;
  const device = devices.get(deviceId);
  if (!device) {
    return res.status(404).json({ error: 'Device not found' });
  }
  res.json(device);
});

// 4. GET /api/devices
app.get('/api/devices', (req, res) => {
  const allDevices = Array.from(devices.values());
  res.json(allDevices);
});

// 5. Offline Detection (runs every 15 seconds)
setInterval(() => {
  const now = Date.now();
  for (const [deviceId, device] of devices.entries()) {
    if (device.status === 'ONLINE' && now - device.lastSeen > 45000) {
      device.status = 'OFFLINE';
      devices.set(deviceId, device);
      console.log(`\n[DEVICE OFFLINE]\n\nDevice: ${deviceId}\n`);
    }
  }
}, 15000);

server.listen(PORT, () => {
  console.log(`[CrimeShield] Emergency server running on port ${PORT}`);
});
