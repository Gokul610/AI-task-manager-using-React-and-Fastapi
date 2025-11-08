// frontend/src/components/tasks/VoiceTaskModal.jsx

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import taskService from '../../services/taskService';
import Button from '../ui/Button';

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const isSpeechSupported = !!SpeechRecognition;

const SUBMIT_COMMANDS = ['save task', 'create task', 'submit task'];

const VoiceTaskModal = ({ isOpen, onClose, onTaskCreated }) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const recognition = useRef(null);
  const transcriptRef = useRef('');

  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);
  
  const stopListening = useCallback(() => {
    if (recognition.current) {
      recognition.current.stop();
    }
    setIsListening(false); 
  }, []);

  const handleClose = useCallback(() => {
    stopListening();
    setTranscript('');
    setError('');
    setLoading(false);
    onClose();
  }, [onClose, stopListening]);

  const handleSubmit = useCallback(async (e, voiceText) => {
    if (e) e.preventDefault(); 
    
    const textToSubmit = voiceText || transcriptRef.current; 

    if (!textToSubmit.trim()) {
      setError('No text to save. Please try speaking again.');
      return;
    }
    
    stopListening();
    setLoading(true);
    setError('');

    try {
      const newTask = await taskService.createTask({ nlp_text: textToSubmit });
      onTaskCreated(newTask); 
      handleClose(); 
    } catch (err) {
      const errorDetail = err.response?.data?.detail || 'Failed to create task.';
      setError(errorDetail);
    }
    setLoading(false);
  }, [onTaskCreated, handleClose, stopListening]);

  // Main effect for the microphone
  useEffect(() => {
    if (!isSpeechSupported) {
      setError('Voice recognition is not supported in this browser. Please try Chrome or Edge.');
      return;
    }

    if (isOpen) {
      // --- Start listening ---
      if (!recognition.current) {
        recognition.current = new SpeechRecognition();
        recognition.current.continuous = true; 
        recognition.current.interimResults = true;
        recognition.current.lang = 'en-US';
      }
      
      recognition.current.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const currentTranscript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += currentTranscript + ' ';
          } else {
            interimTranscript += currentTranscript;
          }
        }
        
        const newFullTranscript = finalTranscript + interimTranscript;
        setTranscript(newFullTranscript); // Update UI

        const lowerTranscript = newFullTranscript.toLowerCase().trim();
        const commandFound = SUBMIT_COMMANDS.find(cmd => lowerTranscript.endsWith(cmd));
        
        if (commandFound) {
          const cleanedTranscript = newFullTranscript
            .substring(0, newFullTranscript.length - commandFound.length)
            .trim();
          
          stopListening();
          handleSubmit(null, cleanedTranscript); 
        }
      };

      recognition.current.onerror = (event) => {
        if (event.error === 'no-speech') {
          // This is a common event, just stop listening
        } else if (event.error === 'audio-capture') {
          setError('Microphone error. Please ensure it is connected and enabled.');
        } else if (event.error === 'not-allowed') {
          setError('Permission to use microphone was denied. Please enable it in your browser settings.');
        }
        stopListening(); // <-- Stop on any error
      };
      
      recognition.current.onend = () => {
        setIsListening(false);
      };
      
      // Start
      setTranscript('');
      setError('');
      setIsListening(true);
      try {
        recognition.current.start();
      } catch (err) {
        if (err.name !== 'InvalidStateError') {
          setError('Failed to start listening. Please try again.');
          setIsListening(false); // Make sure we're not stuck
        }
      }

    } else {
      // --- Modal is closed, stop listening ---
      stopListening();
    }

    // --- Cleanup function ---
    return () => {
      if (recognition.current) {
        recognition.current.onresult = null;
        recognition.current.onend = null;
        recognition.current.onerror = null;
        recognition.current.stop();
      }
    };
  }, [isOpen, handleSubmit, stopListening]); 

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
          onClick={handleClose}
        >
          {/* Modal Content */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="w-full max-w-lg p-6 bg-card text-card-foreground rounded-lg shadow-xl border border-border"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-4 text-2xl font-semibold text-center">
              {isListening ? 'Listening...' : 'Voice Task Creation'}
            </h2>
            
            {isListening ? (
              // Show the pulsing mic AND a "Stop" button
              <div className="flex flex-col items-center">
                <motion.div
                  className="w-24 h-24 mx-auto my-4 rounded-full bg-primary/20 flex items-center justify-center"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                >
                  <div className="w-16 h-16 rounded-full bg-primary/50 flex items-center justify-center">
                    <svg className="w-8 h-8 text-primary-foreground" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
                  </div>
                </motion.div>
                <Button
                  type="button"
                  variant="destructive"
                  className="w-auto px-4 py-1.5 text-sm"
                  onClick={stopListening} // <-- Manually stop listening
                >
                  Stop Listening
                </Button>
              </div>
            ) : (
              // Show a "Restart" button if not listening
              <div className="flex flex-col items-center">
                 <div className="w-24 h-24 mx-auto my-4 rounded-full bg-card flex items-center justify-center">
                   <svg className="w-12 h-12 text-muted-foreground" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
                 </div>
                 <Button
                    type="button"
                    variant="ghost"
                    className="w-auto px-4 py-1.5 text-sm"
                    onClick={() => {
                        // Restart listening
                        if (isOpen) {
                            setIsListening(true);
                            setError('');
                            recognition.current.start();
                        }
                    }}
                  >
                    Tap to Speak Again
                  </Button>
              </div>
            )}

            {error && (
              <p className="px-4 py-3 my-4 text-sm font-medium text-destructive-foreground bg-destructive/20 border border-destructive/30 rounded-lg">
                {error}
              </p> // <-- THIS IS THE FIX (was </Both>)
            )}

            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              className="w-full min-h-[100px] p-3 my-4 border border-border rounded-lg bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Your transcribed text will appear here...
Say 'save task' when you are finished."
              disabled={isListening} // You can now edit this when not listening
            />

            <form onSubmit={handleSubmit}>
              <div className="flex justify-center gap-4 pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleClose}
                  className="w-auto px-6 py-2"
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="w-auto px-6 py-2"
                  disabled={loading || isListening} // This button is now correctly enabled
                >
                  {loading ? 'Saving...' : 'Save Task'}
                </Button>
              </div>
            </form>

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default VoiceTaskModal;