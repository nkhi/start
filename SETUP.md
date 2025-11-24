# Habit Tracker - Google Sheets API Setup

Clean, proper setup using Google Sheets API v4.

## Step 1: Your Google Sheet (Already Done!)

Your spreadsheet: `1p4H7KDQdr4nOcMR3RlRmmXLawC6m7V7livx4ql4fTrU`

Make sure you have:

### Sheet: "HabitConfig"
Row 1 headers:
```
HabitID	Name	Order	DefaultTime	Active	CreatedDate
```

Rows 2-11 (your habits):
```
habit1	Exercise	1	morning	TRUE	2025-11-09
habit2	Meditation	2	morning	TRUE	2025-11-09
habit3	Read	3	night	TRUE	2025-11-09
habit4	Journal	4	night	TRUE	2025-11-09
habit5	Hydration	5	morning	TRUE	2025-11-09
habit6	Yoga	6	morning	TRUE	2025-11-09
habit7	Deep Work	7	morning	TRUE	2025-11-09
habit8	Sleep Early	8	night	TRUE	2025-11-09
habit9	Gratitude	9	night	TRUE	2025-11-09
habit10	No Social Media	10	neither	TRUE	2025-11-09
```

### Sheet: "HabitEntries"
Row 1 headers:
```
EntryID	Date	HabitID	State	Time	Timestamp
```

Leave rows 2+ empty (app will fill them).

---

## Step 2: Google Cloud Setup

### 2.1 Create Project
1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create new project: **"Habit Tracker"**

### 2.2 Enable Google Sheets API
1. Search for **"Google Sheets API"**
2. Click **"Enable"**

### 2.3 Create API Key
1. Go to **"Credentials"**
2. Click **"Create Credentials"** → **"API Key"**
3. Copy your API key
4. Click **"Restrict Key"**:
   - API restrictions: Select **"Google Sheets API"**
   - Application restrictions: 
     - Select **"HTTP referrers"**
     - Add: `*` (for testing) or your domain
   - Save

### 2.4 Make Sheet Accessible
Your sheet needs to be accessible by the API:

**Option A: Make it public** (simplest)
1. Open your sheet
2. Click "Share" → "Anyone with the link"
3. Set to "Editor"

**Option B: Share with service account** (more secure)
1. Create a service account in Google Cloud
2. Share your sheet with the service account email
3. Use service account credentials

For personal use, Option A is fine!

---

## Step 3: Configure Your App

Open `script.js` and update line 4:

```javascript
const CONFIG = {
  startDate: new Date('2025-11-09'),
  spreadsheetId: '1p4H7KDQdr4nOcMR3RlRmmXLawC6m7V7livx4ql4fTrU',
  apiKey: 'PASTE_YOUR_API_KEY_HERE', // ← Paste here!
  stateIcons: ['✕', '✓', '✕', ':)', ':/'],
  stateClasses: ['state-0', 'state-1', 'state-2', 'state-3', 'state-4']
};
```

---

## Step 4: Test It!

1. Open `index.html` in your browser
2. Open DevTools (F12) and check Console
3. You should see:
   ```
   🚀 Starting Habit Tracker...
   📊 Loading data from Google Sheets...
   📡 Fetching data from: HabitConfig!A2:F
   ✅ Fetched 10 rows from HabitConfig!A2:F
   ✅ Loaded 10 habits
   📡 Fetching data from: HabitEntries!A2:F
   ✅ Loaded 0 entries
   ✅ Data loaded successfully!
   🎨 Initializing UI...
   ✅ App ready!
   ```

4. Click some habit cells - they should save to your sheet!

---

## Troubleshooting

### "API key not valid"
- Make sure you enabled Google Sheets API
- Check that API key is restricted to Google Sheets API
- Verify you pasted the key correctly

### "The caller does not have permission"
- Make your sheet public (Share → Anyone with link → Editor)
- Or share it with your service account

### "Sheet not found"
- Check sheet names are exactly "HabitConfig" and "HabitEntries"
- Verify spreadsheet ID is correct

### Still not working?
1. Check browser console (F12) for detailed errors
2. Make sure sheet has data in HabitConfig
3. Try opening the sheet in an incognito window to verify it's accessible

---

## Deploy

Once working locally, deploy to:
- **GitHub Pages**: Push and enable Pages
- **Netlify**: Drag folder to netlify.com/drop
- **Vercel**: Connect repo

Your API key will be visible in the code, but that's OK because:
- It's restricted to Google Sheets API
- The sheet itself controls access
- It's your personal project

For extra security, restrict the API key to your deployed domain!

---

## That's It!

Clean, simple, proper Google Sheets API integration. No webhooks, no CSV parsing, just the API the way Google intended.

Enjoy tracking your habits! 🎉

