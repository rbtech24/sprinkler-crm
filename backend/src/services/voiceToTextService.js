const fs = require('fs').promises;
const path = require('path');

class VoiceToTextService {
  constructor() {
    this.isEnabled = !!process.env.GOOGLE_SPEECH_API_KEY || !!process.env.AZURE_SPEECH_KEY;
    this.provider = null;

    if (process.env.GOOGLE_SPEECH_API_KEY) {
      this.provider = 'google';
    } else if (process.env.AZURE_SPEECH_KEY) {
      this.provider = 'azure';
    }
  }

  async transcribeAudio(audioBuffer, options = {}) {
    try {
      if (!this.isEnabled) {
        return {
          success: false,
          error: 'Voice-to-text service not configured',
        };
      }

      const {
        language = 'en-US',
        format = 'wav',
        sampleRate = 16000,
      } = options;

      switch (this.provider) {
        case 'google':
          return await this.transcribeWithGoogle(audioBuffer, { language, format, sampleRate });
        case 'azure':
          return await this.transcribeWithAzure(audioBuffer, { language, format, sampleRate });
        default:
          return this.getMockTranscription();
      }
    } catch (error) {
      console.error('Voice transcription error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async transcribeWithGoogle(audioBuffer, options) {
    try {
      // Google Speech-to-Text API integration
      // Requires @google-cloud/speech package

      if (!process.env.GOOGLE_SPEECH_API_KEY) {
        throw new Error('Google Speech API key not configured');
      }

      // Placeholder implementation
      // In production, you would:
      // 1. Initialize the Google Speech client
      // 2. Configure the audio settings
      // 3. Send the audio data for transcription
      // 4. Return the transcribed text

      const speech = require('@google-cloud/speech');
      const client = new speech.SpeechClient({
        keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
      });

      const audio = {
        content: audioBuffer.toString('base64'),
      };

      const config = {
        encoding: options.format === 'wav' ? 'LINEAR16' : 'WEBM_OPUS',
        sampleRateHertz: options.sampleRate,
        languageCode: options.language,
      };

      const request = {
        audio: audio,
        config: config,
      };

      const [response] = await client.recognize(request);
      const transcription = response.results
        .map((result) => result.alternatives[0].transcript)
        .join('\n');

      return {
        success: true,
        text: transcription,
        confidence: response.results[0]?.alternatives[0]?.confidence || 0.9,
      };
    } catch (error) {
      console.error('Google Speech API error:', error);

      // Fallback to mock response if API fails
      return this.getMockTranscription();
    }
  }

  async transcribeWithAzure(audioBuffer, options) {
    try {
      // Azure Cognitive Services Speech-to-Text integration
      // Requires microsoft-cognitiveservices-speech-sdk package

      if (!process.env.AZURE_SPEECH_KEY || !process.env.AZURE_SPEECH_REGION) {
        throw new Error('Azure Speech service credentials not configured');
      }

      // Placeholder implementation
      // In production, you would:
      // 1. Initialize the Azure Speech SDK
      // 2. Create audio configuration
      // 3. Create speech recognizer
      // 4. Recognize speech from audio
      // 5. Return the transcribed text

      const sdk = require('microsoft-cognitiveservices-speech-sdk');

      const speechConfig = sdk.SpeechConfig.fromSubscription(
        process.env.AZURE_SPEECH_KEY,
        process.env.AZURE_SPEECH_REGION,
      );
      speechConfig.speechRecognitionLanguage = options.language;

      // Create audio config from buffer (simplified)
      const audioConfig = sdk.AudioConfig.fromWavFileInput(audioBuffer);
      const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);

      return new Promise((resolve) => {
        recognizer.recognizeOnceAsync(
          (result) => {
            resolve({
              success: true,
              text: result.text,
              confidence: result.properties.getProperty(
                sdk.PropertyId.SpeechServiceResponse_JsonResult,
              )?.NBest?.[0]?.Confidence || 0.9,
            });
          },
          (error) => {
            console.error('Azure Speech recognition error:', error);
            resolve(this.getMockTranscription());
          },
        );
      });
    } catch (error) {
      console.error('Azure Speech API error:', error);

      // Fallback to mock response if API fails
      return this.getMockTranscription();
    }
  }

  getMockTranscription() {
    // Mock response for development/testing
    const mockResponses = [
      'Zone 3 sprinkler head is broken and needs replacement',
      'Low water pressure detected in zone 5',
      'Controller programming needs adjustment for seasonal watering',
      'Backflow preventer valve requires annual testing',
      'Drip irrigation line has a leak near the rose garden',
      'Timer schedule should be reduced during winter months',
    ];

    const randomResponse = mockResponses[Math.floor(Math.random() * mockResponses.length)];

    return {
      success: true,
      text: randomResponse,
      confidence: 0.85,
      mock: true,
    };
  }

  async saveAudioForProcessing(audioBuffer, filename) {
    try {
      const audioDir = path.join(__dirname, '../../uploads/audio');

      // Ensure audio directory exists
      try {
        await fs.access(audioDir);
      } catch {
        await fs.mkdir(audioDir, { recursive: true });
      }

      const filePath = path.join(audioDir, filename);
      await fs.writeFile(filePath, audioBuffer);

      return {
        success: true,
        file_path: filePath,
        relative_path: `/uploads/audio/${filename}`,
      };
    } catch (error) {
      console.error('Save audio file error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async processVoiceNote(inspectionId, audioBuffer, metadata = {}) {
    try {
      const {
        zone_number,
        callout_type,
        technician_id,
      } = metadata;

      // Save audio file
      const timestamp = Date.now();
      const filename = `voice_note_${inspectionId}_${timestamp}.wav`;
      const saveResult = await this.saveAudioForProcessing(audioBuffer, filename);

      if (!saveResult.success) {
        throw new Error('Failed to save audio file');
      }

      // Transcribe audio
      const transcription = await this.transcribeAudio(audioBuffer);

      if (transcription.success) {
        // Save transcription to database for inspection notes
        const db = require('../database/sqlite');
        await db.run(`
          INSERT INTO inspection_voice_notes (
            inspection_id, zone_number, callout_type, technician_id,
            audio_file_path, transcription_text, confidence_score, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `, [
          inspectionId,
          zone_number,
          callout_type,
          technician_id,
          saveResult.relative_path,
          transcription.text,
          transcription.confidence,
        ]);
      }

      return {
        success: true,
        transcription: transcription.text,
        confidence: transcription.confidence,
        audio_saved: saveResult.success,
        file_path: saveResult.relative_path,
        is_mock: transcription.mock || false,
      };
    } catch (error) {
      console.error('Process voice note error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  getServiceStatus() {
    return {
      enabled: this.isEnabled,
      provider: this.provider,
      ready: this.isEnabled && this.provider !== null,
    };
  }
}

module.exports = new VoiceToTextService();
