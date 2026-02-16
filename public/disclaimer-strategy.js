// ========== OPTIMAL DISCLAIMER STRATEGY ==========
// STRATEGY: Full disclaimer ONCE + Crisis check EVERY session
// This balances maximum legal protection with best user experience

(function() {
    'use strict';
    
    const DISCLAIMER_VERSION = '3.0'; // Update this when terms change
    
    // ========== CHECK DISCLAIMER & CRISIS STATUS ==========
    function checkDisclaimerStatus() {
        const fullAck = localStorage.getItem('mphaven_disclaimer_acknowledged');
        const version = localStorage.getItem('mphaven_disclaimer_version');
        const timestamp = localStorage.getItem('mphaven_disclaimer_timestamp');
        const lastCrisisCheck = localStorage.getItem('mphaven_last_crisis_check');
        
        // 1. NO DISCLAIMER AT ALL → Send to full disclaimer
        if (fullAck !== 'true' || !version || !timestamp) {
            console.log('No disclaimer found - redirecting to full disclaimer');
            window.location.href = 'disclaimer.html';
            return;
        }
        
        // 2. VERSION CHANGED → Re-acknowledge (legal requirement)
        if (version !== DISCLAIMER_VERSION) {
            console.log('Disclaimer version changed - re-acknowledgment required');
            localStorage.removeItem('mphaven_disclaimer_acknowledged');
            localStorage.removeItem('mphaven_disclaimer_timestamp');
            localStorage.removeItem('mphaven_disclaimer_version');
            window.location.href = 'disclaimer.html';
            return;
        }
        
        // 3. OPTIONAL: Time-based expiration (uncomment if you want)
        // Only re-prompts if disclaimer is REALLY old (e.g., 90 days)
        // const ninetyDays = 90 * 24 * 60 * 60 * 1000;
        // if (Date.now() - new Date(timestamp).getTime() > ninetyDays) {
        //     console.log('Disclaimer very old (90+ days) - re-acknowledgment required');
        //     localStorage.removeItem('mphaven_disclaimer_acknowledged');
        //     window.location.href = 'disclaimer.html';
        //     return;
        // }
        
        // 4. QUICK CRISIS CHECK (every session)
        const now = Date.now();
        const lastCheck = lastCrisisCheck ? new Date(lastCrisisCheck).getTime() : 0;
        const timeSinceCheck = now - lastCheck;
        
        // Check if last crisis check was more than 5 minutes ago (new session)
        const fiveMinutes = 5 * 60 * 1000;
        
        if (timeSinceCheck > fiveMinutes || !lastCrisisCheck) {
            console.log('Crisis check needed - new session detected');
            showQuickCrisisCheck();
            return;
        }
        
        // 5. ALL GOOD → Let them use app
        console.log('All checks passed - initializing app');
        initializeApp();
    }
    
    // ========== QUICK CRISIS CHECK (2-3 seconds) ==========
    function showQuickCrisisCheck() {
        // Prevent multiple modals
        if (document.getElementById('quickCrisisModal')) {
            return;
        }
        
        const modal = document.createElement('div');
        modal.id = 'quickCrisisModal';
        modal.innerHTML = `
            <div style="
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.95);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 999999;
                padding: 20px;
                animation: fadeIn 0.3s ease;
            ">
                <div style="
                    background: linear-gradient(135deg, rgba(15, 23, 42, 0.98), rgba(30, 41, 59, 0.95));
                    border: 2px solid rgba(220, 38, 38, 0.5);
                    border-radius: 1.5rem;
                    padding: 2rem;
                    max-width: 500px;
                    width: 100%;
                    box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
                    animation: slideUp 0.3s ease;
                ">
                    <h2 style="
                        color: #fca5a5;
                        font-size: 1.5rem;
                        font-weight: 800;
                        margin-bottom: 1rem;
                        font-family: 'Inter', -apple-system, sans-serif;
                    ">🚨 Quick Safety Check</h2>
                    
                    <p style="
                        color: rgb(203, 213, 225);
                        font-size: 1rem;
                        line-height: 1.6;
                        margin-bottom: 1.5rem;
                        font-family: 'Inter', -apple-system, sans-serif;
                    ">
                        Are you currently experiencing thoughts of self-harm or suicide?
                    </p>
                    
                    <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                        <button onclick="window.handleQuickCheck('yes')" style="
                            padding: 1rem;
                            background: rgba(220, 38, 38, 0.2);
                            border: 2px solid #dc2626;
                            border-radius: 0.75rem;
                            color: #fca5a5;
                            font-size: 1rem;
                            font-weight: 600;
                            cursor: pointer;
                            font-family: 'Inter', -apple-system, sans-serif;
                            transition: all 0.2s;
                        " onmouseover="this.style.background='rgba(220, 38, 38, 0.3)'" onmouseout="this.style.background='rgba(220, 38, 38, 0.2)'">
                            Yes, I need help now
                        </button>
                        
                        <button onclick="window.handleQuickCheck('no')" style="
                            padding: 1rem;
                            background: linear-gradient(135deg, #0e7490, #d97706);
                            border: none;
                            border-radius: 0.75rem;
                            color: white;
                            font-size: 1rem;
                            font-weight: 700;
                            cursor: pointer;
                            font-family: 'Inter', -apple-system, sans-serif;
                            box-shadow: 0 10px 25px rgba(14, 116, 144, 0.3);
                            transition: all 0.2s;
                        " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 15px 30px rgba(14, 116, 144, 0.4)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 10px 25px rgba(14, 116, 144, 0.3)'">
                            No, I'm safe to continue
                        </button>
                    </div>
                    
                    <div id="crisisInfo" style="
                        display: none;
                        margin-top: 1.5rem;
                        padding: 1rem;
                        background: rgba(0, 0, 0, 0.4);
                        border-left: 4px solid #dc2626;
                        border-radius: 0.5rem;
                    ">
                        <p style="
                            color: #fca5a5;
                            font-size: 0.875rem;
                            font-weight: 600;
                            margin-bottom: 0.5rem;
                            font-family: 'Inter', -apple-system, sans-serif;
                        ">🚨 PLEASE GET HELP NOW:</p>
                        <p style="
                            color: #fca5a5;
                            font-size: 0.875rem;
                            margin-bottom: 0.25rem;
                            font-family: 'Inter', -apple-system, sans-serif;
                        ">• Call/text <a href="tel:988" style="color: #fca5a5; font-weight: 700; text-decoration: none;">988</a> (Suicide & Crisis Lifeline)</p>
                        <p style="
                            color: #fca5a5;
                            font-size: 0.875rem;
                            margin-bottom: 0.25rem;
                            font-family: 'Inter', -apple-system, sans-serif;
                        ">• Text HOME to <a href="sms:741741" style="color: #fca5a5; font-weight: 700; text-decoration: none;">741741</a> (Crisis Text Line)</p>
                        <p style="
                            color: #fca5a5;
                            font-size: 0.875rem;
                            font-family: 'Inter', -apple-system, sans-serif;
                        ">• Call <a href="tel:911" style="color: #fca5a5; font-weight: 700; text-decoration: none;">911</a> or go to nearest ER</p>
                        <p style="
                            color: #fca5a5;
                            font-size: 0.875rem;
                            font-weight: 700;
                            margin-top: 0.75rem;
                            font-family: 'Inter', -apple-system, sans-serif;
                        ">⚠️ This app cannot help in a crisis. Professional help is available 24/7.</p>
                    </div>
                </div>
            </div>
            
            <style>
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideUp {
                    from { 
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to { 
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
            </style>
        `;
        
        document.body.appendChild(modal);
        
        // Handle crisis check response
        window.handleQuickCheck = function(answer) {
            if (answer === 'yes') {
                // Show crisis resources and BLOCK access
                document.getElementById('crisisInfo').style.display = 'block';
                console.log('User in crisis - access blocked');
                
                // DO NOT let them continue - stay on this screen
                // They must call for help or close the app
                
            } else {
                // User is safe - record check and continue
                localStorage.setItem('mphaven_last_crisis_check', new Date().toISOString());
                console.log('Crisis check passed - continuing to app');
                
                // Remove modal with animation
                modal.style.animation = 'fadeOut 0.3s ease';
                setTimeout(() => {
                    modal.remove();
                    initializeApp();
                }, 300);
            }
        };
        
        // Add fadeOut animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes fadeOut {
                from { opacity: 1; }
                to { opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }
    
    // ========== YOUR APP INITIALIZATION ==========
    function initializeApp() {
        console.log('✅ App initialized - user is safe and has acknowledged disclaimer');
        
        // Your normal app startup code here
        // For example:
        // - Load user data
        // - Initialize UI
        // - Start main app logic
        
        // Example: Show a welcome message
        // const welcomeMsg = document.getElementById('welcomeMessage');
        // if (welcomeMsg) welcomeMsg.textContent = 'Welcome back!';
    }
    
    // ========== RUN ON PAGE LOAD ==========
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', checkDisclaimerStatus);
    } else {
        checkDisclaimerStatus();
    }
    
})();

// ========== USAGE INSTRUCTIONS ==========
/*

HOW TO USE THIS IN YOUR APP:

1. Add this script to the TOP of your app.html file:
   <script src="optimal-disclaimer-strategy.js"></script>
   
   OR paste this entire code in a <script> tag at the top of app.html

2. Replace `initializeApp()` function with your actual app initialization code

3. Update DISCLAIMER_VERSION when you change terms:
   const DISCLAIMER_VERSION = '3.1'; // Increment when terms change

4. (Optional) Uncomment the 90-day expiration if you want time-based re-ack

WHAT THIS DOES:

✅ Full disclaimer: ONCE (or when version changes)
✅ Crisis check: EVERY SESSION (new session = 5+ minutes since last check)
✅ Blocks access if user is in crisis
✅ Records timestamps for legal compliance
✅ Smooth animations and good UX

LEGAL PROTECTION:

- Active crisis screening every session = ongoing duty of care
- Version tracking = automatic re-ack when terms change
- Timestamps = proof of ongoing consent
- Same or better legal protection than 7-day re-ack

USER EXPERIENCE:

- Full disclaimer only once (not annoying)
- Quick 2-second crisis check (barely noticeable)
- No forced re-acknowledgment unless version changes
- Much better retention and satisfaction

*/
