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

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3001;

// Real-time call tracking state
let callState = {
  active: false,
  status: 'idle', // 'idle', 'initiating', 'calling', 'ringing', 'connected', 'disconnected'
  timer: 0,
  pole: null,
  latitude: null,
  longitude: null
};

// Twilio Config
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;
const toNumber = process.env.EMERGENCY_CONTACT;

let twilioClient = null;
const isTwilioConfigured = accountSid && authToken && fromNumber && toNumber && 
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

  if (!pole || latitude === undefined || longitude === undefined) {
    return res.status(400).json({ error: 'Missing required parameters: pole, latitude, longitude' });
  }

  // Prevent duplicate calls
  if (callState.active) {
    return res.status(400).json({ error: 'An emergency call is already active or in progress' });
  }

  console.log(`[CrimeShield] Initiating call for ${pole} (Lat: ${latitude}, Lng: ${longitude})`);

  callState = {
    active: true,
    status: 'initiating',
    timer: 0,
    pole,
    latitude,
    longitude
  };
  io.emit('call_state', callState);

  if (isTwilioConfigured && twilioClient) {
    try {
      // Build dynamic inline TwiML text-to-speech
      const twiml = `
        <Response>
          <Say voice="alice" loop="2">
            Emergency alert triggered at ${pole}. 
            Location coordinates are: latitude ${latitude.toFixed(6)}, longitude ${longitude.toFixed(6)}. 
            Please check the Crime Shield dispatch dashboard immediately.
          </Say>
        </Response>
      `;

      const call = await twilioClient.calls.create({
        twiml,
        to: toNumber,
        from: fromNumber
      });

      console.log(`[CrimeShield] Twilio call created. SID: ${call.sid}`);
      callState.status = 'ringing';
      io.emit('call_state', callState);

      // Transition to connected automatically for the dashboard view
      setTimeout(() => {
        if (callState.active && callState.status === 'ringing') {
          callState.status = 'connected';
          io.emit('call_state', callState);
        }
      }, 3500);

      return res.json({ success: true, callSid: call.sid });
    } catch (error) {
      console.error('[CrimeShield] Twilio Voice call failed:', error);
      callState.status = 'disconnected';
      callState.active = false;
      io.emit('call_state', callState);
      return res.status(500).json({ error: 'Twilio call failed to place', details: error.message });
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
          io.emit('call_state', callState);
        }, 3000);
      }, 2000);
    }, 1500);
  }
});

// End call endpoint
app.post('/api/end-call', (req, res) => {
  console.log('[CrimeShield] Ending active emergency call');
  callState = {
    active: false,
    status: 'idle',
    timer: 0,
    pole: null,
    latitude: null,
    longitude: null
  };
  io.emit('call_state', callState);
  res.json({ success: true });
});

// Periodic call timer trigger (every 1 second)
setInterval(() => {
  if (callState.active && callState.status === 'connected') {
    callState.timer += 1;
    io.emit('call_timer', callState.timer);
  }
}, 1000);

server.listen(PORT, () => {
  console.log(`[CrimeShield] Emergency server running on port ${PORT}`);
});
