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

  if (!pole) {
    return res.status(400).json({ error: 'Missing required parameter: pole' });
  }

  // Parse coordinates safely (handles null, undefined, or invalid input)
  const parsedLat = Number(latitude);
  const parsedLng = Number(longitude);
  const safeLat = isNaN(parsedLat) || latitude === null ? 0 : parsedLat;
  const safeLng = isNaN(parsedLng) || longitude === null ? 0 : parsedLng;

  // Prevent duplicate calls
  if (callState.active) {
    return res.status(400).json({ error: 'An emergency call is already active or in progress' });
  }

  console.log(`[CrimeShield] Initiating call for ${pole} (Lat: ${safeLat}, Lng: ${safeLng})`);

  callState = {
    active: true,
    status: 'initiating',
    timer: 0,
    pole,
    latitude: safeLat,
    longitude: safeLng
  };
  io.emit('call_state', callState);

  if (isTwilioConfigured && twilioClient) {
    try {
      const rawPublicUrl = process.env.PUBLIC_URL || '';
      const publicUrl = rawPublicUrl.replace(/\/$/, '');

      // 1. Send SMS automatically in the background
      const googleMapsLink = `https://maps.google.com/?q=${safeLat},${safeLng}`;
      const messageBody = `CrimeShield ALERT: Emergency reported at ${pole}.\nLocation: ${googleMapsLink}`;

      twilioClient.messages.create({
        body: messageBody,
        to: toNumber,
        from: fromNumber
      }).then(msg => {
        console.log(`[CrimeShield] SMS sent automatically. SID: ${msg.sid}`);
      }).catch(err => {
        console.error('[CrimeShield] Automatic SMS sending failed:', err);
      });

      // 2. Build TwiML for simple voice announcement
      const twiml = `
        <Response>
          <Say voice="alice" loop="2">
            Emergency alert triggered at ${pole}. 
            Location coordinates are: latitude ${safeLat.toFixed(6)}, longitude ${safeLng.toFixed(6)}. 
            A text message with the Google Maps link has been sent to your phone.
            Please check the Crime Shield dispatch dashboard immediately.
          </Say>
        </Response>
      `;

      const callParams = {
        twiml,
        to: toNumber,
        from: fromNumber
      };

      if (publicUrl) {
        callParams.statusCallback = `${publicUrl}/api/twilio/call-status`;
        callParams.statusCallbackEvent = ['initiated', 'ringing', 'answered', 'completed'];
        callParams.statusCallbackMethod = 'POST';
      }

      const call = await twilioClient.calls.create(callParams);

      console.log(`[CrimeShield] Twilio call created. SID: ${call.sid}`);
      callState.status = 'ringing';
      io.emit('call_state', callState);

      // Transition to connected automatically only if no publicUrl is set as a fallback
      if (!publicUrl) {
        setTimeout(() => {
          if (callState.active && callState.status === 'ringing') {
            callState.status = 'connected';
            io.emit('call_state', callState);
          }
        }, 3500);
      }

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
  console.log(`[CrimeShield] Twilio Call Status Update: ${callStatus}`);

  if (callStatus === 'completed' || callStatus === 'failed' || callStatus === 'busy' || callStatus === 'no-answer' || callStatus === 'canceled') {
    console.log(`[CrimeShield] Call ended physically. Resetting state.`);
    callState = {
      active: false,
      status: 'idle',
      timer: 0,
      pole: null,
      latitude: null,
      longitude: null
    };
    io.emit('call_state', callState);
  } else if (callStatus === 'answered' || callStatus === 'in-progress') {
    callState.status = 'connected';
    io.emit('call_state', callState);
  } else if (callStatus === 'ringing') {
    callState.status = 'ringing';
    io.emit('call_state', callState);
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

server.listen(PORT, () => {
  console.log(`[CrimeShield] Emergency server running on port ${PORT}`);
});
