// frontend/src/pages/DashboardPage.jsx

import React, { useState } from 'react'; // <-- Import useState
import Header from '../components/layout/Header';
import TaskList from '../components/tasks/TaskList';
import AchievementList from '../components/gamification/AchievementList';
import ProgressWidget from '../components/dashboard/ProgressWidget'; 

// --- NEW IMPORTS ---
import NewTaskModal from '../components/tasks/NewTaskModal';
import ManualTaskModal from '../components/tasks/ManualTaskModal';
import VoiceTaskModal from '../components/tasks/VoiceTaskModal';
// --- REMOVED 'Button' import ---
// import Button from '../components/ui/Button'; 
// -------------------

const DashboardPage = () => {
  // --- NEW: State for modals is now managed here ---
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);

  // --- NEW: Handlers for modals are now managed here ---
  const openManualModal = () => setIsManualModalOpen(true);
  const closeManualModal = () => setIsManualModalOpen(false);
  
  const openVoiceModal = () => setIsVoiceModalOpen(true);
  const closeVoiceModal = () => setIsVoiceModalOpen(false);

  // This handler is passed to all task creation modals
  const handleTaskCreated = (newTask) => {
    // Just refresh the list, modals will close themselves
    // Notify gamification and progress components
    document.dispatchEvent(new CustomEvent('taskUpdated'));
  };
  // ----------------------------------------------------

  return (
    // --- MODIFIED: Added subtle gradient to main page background ---
    <div className="min-h-screen bg-background text-foreground bg-gradient-to-br from-background to-card">
    {/* ----------------------------------------------------------- */}
      {/* Container to center content */}
      <div className="w-full max-w-6xl p-4 mx-auto md:p-8">
        <Header />
        
        <ProgressWidget />

        <main>
          {/* --- MODIFIED: New Full-Width Grid Layout --- */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            
            {/* Row 1: Add New Task (Full Width) */}
            <div className="lg:col-span-3">
              <NewTaskModal 
                onTaskCreated={handleTaskCreated} 
                onVoiceInputClick={openVoiceModal}
                onManualInputClick={openManualModal}
              />
            </div>

            {/* Row 2: Priority Matrix (Full Width) */}
            <div className="lg:col-span-3">
              <TaskList />
            </div>

            {/* Row 3: Achievements (Full Width) */}
            <div className="lg:col-span-3"> 
              <AchievementList />
            </div>
          </div>
          {/* --- END OF NEW GRID --- */}
        </main>
      </div>

      {/* --- NEW: Modals are now rendered here at the page level --- */}
       <ManualTaskModal
          isOpen={isManualModalOpen}
          onClose={closeManualModal}
          onTaskCreated={handleTaskCreated}
       />
       
       <VoiceTaskModal
          isOpen={isVoiceModalOpen}
          onClose={closeVoiceModal}
          onTaskCreated={handleTaskCreated}
       />
      {/* --------------------------------------------------------- */}
    </div>
  );
};

export default DashboardPage;