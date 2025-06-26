import { useEffect } from 'react';
import OneSignal from 'react-onesignal';
import ChatContainer from "./Components/ChatContainer";

function App() {
  useEffect(() => {
    // Initialize OneSignal only in the browser
    if (typeof window !== 'undefined') {
      OneSignal.init({
        appId: 'YOUR_ONESIGNAL_APP_ID', // Replace with your real ID
        allowLocalhostAsSecureOrigin: true, // Enable for local testing
        notifyButton: {
          enable: true, // Show the bell icon for managing subscriptions
        }
      }).then(() => {
        OneSignal.Notifications.requestPermission(); // Prompt user for permissions
      });
    }
  }, []);

  return (
    <div className="App">
      <ChatContainer />
    </div>
  );
}

export default App;