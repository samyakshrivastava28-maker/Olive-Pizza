import React from 'react';
import { useSectionDesignerStore } from '../../../stores/sectionDesignerStore';
import { ChatConsole } from './components/ChatConsole';
import { AgentLog } from './components/AgentLog';
import { CodeViewer } from './components/CodeViewer';

export const AgentTab: React.FC = () => {
  const {
    messages, pendingQuestion, isAgentRunning, agentSteps, generatedFiles,
    startSession, answerQuestion,
  } = useSectionDesignerStore();

  const handleSend = async (prompt: string, images?: string[]) => {
    await startSession(prompt, images);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Chat takes flex space */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <ChatConsole
          messages={messages}
          pendingQuestion={pendingQuestion}
          isAgentRunning={isAgentRunning}
          onSend={handleSend}
          onAnswer={answerQuestion}
        />
      </div>

      {/* Agent log — fixed height, collapsible */}
      <AgentLog steps={agentSteps} />

      {/* Code output — fixed height, collapsible */}
      {generatedFiles.length > 0 && <CodeViewer files={generatedFiles} />}
    </div>
  );
};
