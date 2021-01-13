import React from 'react';
import SipAlgDetector from './components/sipAlgDetector';

export default class App extends React.Component {
    dummy = () => {
        // Just to test arrow functions
    }
    
    render() {
        console.log("Starting SIP ALG Detector...");
        return (
            <SipAlgDetector />
        );
    }
    
}
