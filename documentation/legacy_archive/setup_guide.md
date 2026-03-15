# **Deployment Roadmap: The "Moment 5" Zero-Latency Campaign**

This document tracks the technical rollout of the **AudioRestore Ultra v4.0** platform. As an IT Specialist, this is your "Runbook" for transitioning from development to a live revenue-generating service.

## **1\. Firebase Environment Setup (The Foundation)**

To ensure the "Ultra" script and the "Success" state work correctly, your Firebase hosting must be configured for clean URLs.

1. **Initialize:** In your terminal, run firebase init hosting.  
2. **Configuration:** Ensure your firebase.json allows for redirects.  
3. **Deploy:** Run firebase deploy.  
4. **Domain Handshake:** Confirm delgadologic.tech shows the green "Connected" status in the Firebase Console.

## **2\. PayPal "Zero-Latency" Configuration**

Your setup now uses **Auto-Return** and **PDT (Payment Data Transfer)** to eliminate fulfillment delays.

* **Auto-Return URL:** Verified as https://delgadologic.tech?session=success.  
* **The Logic:** This ensures that the moment a customer clicks "Pay," they are warped back to your site where the index.html logic triggers the immediate PDF download.

## **3\. Product Storage & Security**

Your **Pro Recovery Guide (PDF)** and the **Ultra v4.0 Script** are your "Gold" assets.

* **Hosting:** Store a backup of the PDF in your product/ folder locally and upload a copy to Firebase Storage.  
* **Pathing:** Use the path /artifacts/delgadologic/public/data/sales in Firestore to log every successful automated download for your audit logs.

## **4\. Post-Execution Checklist (The "Quality Gate")**

After running the **Ultra v4.0** script, verify the following to ensure the "Product" is working as intended:

1. **Test Tone:** Did the Windows test tone play? (Confirms the audio engine restarted).  
2. **Log Verification:** Open C:\\Users\\...\\Temp\\DelgadoLogic\_Ultra\_v4.log. Does it show "REPAIR COMPLETE"?  
3. **Restore Point:** Go to "Create a Restore Point" in Windows and click "System Restore." Verify you see DelgadoLogic\_AudioRestore\_PreFix in the list.  
4. **Hardware Status:** Open **Device Manager**. Confirm the Audio Controller does not have a yellow exclamation mark.

## **5\. Technical Support FAQ (Side Effects)**

**Q: Why did Skype/Teams/Zoom open when I ran the script?**

A: This is normal. The script performs a "Hardware Re-enumeration." Windows notifies all communication apps that a "new" audio device has arrived. These apps often pop up or wake up to ask if you want to use the refreshed hardware.

**Q: I pasted the path but nothing happened.**

A: If your file path has spaces, PowerShell needs the **Call Operator (&)**. Type & followed by the quoted path and hit Enter.

**Q: I get a "Scripts are disabled" error.**

A: Run this command in the Admin PowerShell window first:

Set-ExecutionPolicy \-ExecutionPolicy RemoteSigned \-Scope CurrentUser

## **6\. Daily Operations (The "Lead Engineer" Routine)**

* **09:00:** Check PayPal for "Payment Received" notifications.  
* **09:05:** Verify Firestore logs to ensure the automated email triggered correctly.  
* **09:10:** Check Google Ads "Cost-per-Click" (CPC). If it's over $1.00, adjust the keyword bidding to stay profitable.