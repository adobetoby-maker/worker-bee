interface IntakeConfig {
  token: string
  siteName: string
  product: string
  label: string
  apiBase: string
  submitted: boolean
}

function escHtml(s: string): string {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
           .replace(/"/g,'&quot;').replace(/'/g,'&#39;')
}

// Safe for JS string literals — escapes backslash, quote, newline, and </script> sequences
function escJs(s: string): string {
  return s.replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/\r?\n/g,'\\n')
           .replace(/<\/script/gi,'<\\/script')
}

export function generateIntakeHTML(cfg: IntakeConfig): string {
  const { token, siteName, apiBase, submitted } = cfg
  const safeToken   = escJs(token)          // only hex chars in practice, but defend anyway
  const safeSiteName = escHtml(siteName)
  const safeApiBase  = escJs(apiBase)

  if (submitted) {
    return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Already Submitted</title>
<style>body{font-family:-apple-system,sans-serif;background:#0a0a0a;color:#e2e8f0;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
.card{background:#1a1a2e;border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:48px;text-align:center;max-width:480px}
h1{color:#34d399;margin:0 0 12px}p{color:#94a3b8;margin:0}</style></head>
<body><div class="card"><div style="font-size:48px;margin-bottom:16px">✅</div>
<h1>Already submitted!</h1><p>We received your information and your project is in the build queue. We'll reach out shortly.</p></div></body></html>`
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Business Info — ${safeSiteName}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text','Segoe UI',sans-serif;
    background:#060d12;color:#e2e8f0;min-height:100vh;padding:0 0 60px}

  .hero{background:linear-gradient(135deg,rgba(0,100,255,.15),rgba(0,200,150,.08));
    border-bottom:1px solid rgba(255,255,255,.06);padding:36px 24px 32px;text-align:center}
  .hero h1{font-size:clamp(22px,5vw,32px);font-weight:700;color:#fff;margin-bottom:8px}
  .hero p{color:#94a3b8;font-size:15px;max-width:480px;margin:0 auto;line-height:1.6}
  .badge{display:inline-flex;align-items:center;gap:6px;background:rgba(0,229,160,.12);
    color:#00e5a0;border:1px solid rgba(0,229,160,.25);border-radius:20px;
    font-size:12px;font-weight:600;padding:4px 12px;margin-bottom:16px;letter-spacing:.5px}

  .container{max-width:640px;margin:0 auto;padding:0 16px}

  .section{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);
    border-radius:16px;padding:24px;margin-top:20px}
  .section-title{font-size:13px;font-weight:600;color:#64748b;text-transform:uppercase;
    letter-spacing:.8px;margin-bottom:18px;display:flex;align-items:center;gap:8px}
  .section-title::before{content:'';display:block;width:3px;height:14px;
    border-radius:2px;background:currentColor}

  .grid{display:grid;gap:14px}
  .grid-2{grid-template-columns:1fr 1fr}
  @media(max-width:500px){.grid-2{grid-template-columns:1fr}}

  label{display:block;font-size:13px;color:#94a3b8;margin-bottom:6px}
  label span{color:#f87171;margin-left:2px}

  input,textarea,select{width:100%;background:#0d1520;border:1px solid rgba(255,255,255,.1);
    border-radius:10px;padding:12px 14px;color:#e2e8f0;font-size:15px;outline:none;
    transition:border-color .15s,box-shadow .15s;font-family:inherit}
  input:focus,textarea:focus,select:focus{border-color:#3b82f6;
    box-shadow:0 0 0 3px rgba(59,130,246,.15)}
  input::placeholder,textarea::placeholder{color:#475569}
  textarea{resize:vertical;min-height:80px}

  .color-row{display:flex;gap:10px;align-items:center}
  input[type=color]{width:48px;height:48px;padding:4px;cursor:pointer;flex-shrink:0;border-radius:8px}
  .color-hex{flex:1}

  /* Checkbox services */
  .services-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:8px}
  .service-chip input{display:none}
  .service-chip label{display:flex;align-items:center;gap:8px;padding:10px 14px;
    background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);
    border-radius:8px;cursor:pointer;font-size:14px;color:#94a3b8;transition:all .15s}
  .service-chip input:checked + label{background:rgba(59,130,246,.12);
    border-color:rgba(59,130,246,.4);color:#93c5fd}
  .service-chip label:hover{border-color:rgba(255,255,255,.15);color:#e2e8f0}

  /* Photo upload */
  .photo-drop{border:2px dashed rgba(255,255,255,.1);border-radius:12px;
    padding:32px;text-align:center;cursor:pointer;transition:all .15s}
  .photo-drop:hover,.photo-drop.drag{border-color:rgba(59,130,246,.5);background:rgba(59,130,246,.05)}
  .photo-drop p{color:#64748b;font-size:14px;margin-top:8px}
  .photo-previews{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}
  .photo-preview{width:72px;height:72px;border-radius:8px;object-fit:cover;border:1px solid rgba(255,255,255,.1)}

  /* Hours */
  .hours-row{display:grid;grid-template-columns:80px 1fr 1fr;gap:8px;align-items:center;margin-bottom:8px}
  .day-label{font-size:13px;color:#64748b}

  /* Submit */
  .submit-btn{width:100%;background:linear-gradient(135deg,#2563eb,#1d4ed8);
    color:#fff;border:none;border-radius:12px;padding:16px;font-size:16px;
    font-weight:600;cursor:pointer;margin-top:24px;transition:opacity .15s;
    display:flex;align-items:center;justify-content:center;gap:8px}
  .submit-btn:hover{opacity:.9}
  .submit-btn:disabled{opacity:.5;cursor:not-allowed}
  .submit-btn .spinner{width:18px;height:18px;border:2px solid rgba(255,255,255,.3);
    border-top-color:#fff;border-radius:50%;animation:spin .7s linear infinite;display:none}
  @keyframes spin{to{transform:rotate(360deg)}}

  .success{background:rgba(16,185,129,.08);border:1px solid rgba(16,185,129,.25);
    border-radius:12px;padding:24px;text-align:center;display:none}
  .success h2{color:#34d399;margin-bottom:8px}
  .success p{color:#64748b;font-size:14px}

  .required-note{color:#475569;font-size:12px;margin-top:24px;text-align:center}
</style>
</head>
<body>

<div class="hero">
  <div class="badge">🏗️ Site Setup Form</div>
  <h1>Tell us about ${safeSiteName}</h1>
  <p>Fill in the details below — we'll use this to build and configure your website.
     This takes about 10 minutes and the more you give us, the better your site will look on day one.</p>
</div>

<div class="container">
  <form id="intake" onsubmit="handleSubmit(event)">

    <!-- COMPANY BASICS -->
    <div class="section">
      <div class="section-title">Your Business</div>
      <div class="grid">
        <div>
          <label>Business Name <span>*</span></label>
          <input name="company_name" required placeholder="Mountain Ridge Plumbing">
        </div>
        <div>
          <label>Legal Business Name</label>
          <input name="legal_name" placeholder="Mountain Ridge Plumbing LLC">
        </div>
        <div>
          <label>Tagline / Slogan</label>
          <input name="tagline" placeholder="Fast. Local. Trusted.">
        </div>
      </div>
    </div>

    <!-- CONTACT -->
    <div class="section">
      <div class="section-title">Contact Information</div>
      <div class="grid grid-2">
        <div>
          <label>Primary Phone <span>*</span></label>
          <input name="phone" required placeholder="(208) 555-0100" type="tel">
        </div>
        <div>
          <label>Second Phone (optional)</label>
          <input name="phone2" placeholder="(208) 555-0200" type="tel">
        </div>
        <div>
          <label>Business Email <span>*</span></label>
          <input name="email" required placeholder="office@yourbusiness.com" type="email">
        </div>
        <div>
          <label>Current Website (if any)</label>
          <input name="website" placeholder="https://yourbusiness.com" type="url">
        </div>
      </div>
    </div>

    <!-- ADDRESS -->
    <div class="section">
      <div class="section-title">Business Address</div>
      <div class="grid">
        <div>
          <label>Street Address</label>
          <input name="address" placeholder="2491 Kimberly Rd, Unit R">
        </div>
        <div class="grid grid-2">
          <div>
            <label>City</label>
            <input name="city" placeholder="Twin Falls">
          </div>
          <div>
            <label>State</label>
            <input name="state" placeholder="ID" maxlength="2">
          </div>
          <div>
            <label>ZIP</label>
            <input name="zip" placeholder="83301" maxlength="10">
          </div>
        </div>
        <div>
          <label>Cities You Serve (comma-separated)</label>
          <input name="service_area_raw" placeholder="Twin Falls, Jerome, Burley, Buhl, Kimberly">
        </div>
      </div>
    </div>

    <!-- BRAND -->
    <div class="section">
      <div class="section-title">Brand & Logo</div>
      <div class="grid">
        <div>
          <label>Primary Brand Color</label>
          <div class="color-row">
            <input type="color" id="colorPicker" value="#1e40af" oninput="document.getElementById('colorHex').value=this.value">
            <input class="color-hex" id="colorHex" name="primary_color" value="#1e40af" placeholder="#1e40af"
              oninput="document.getElementById('colorPicker').value=this.value||'#000000'">
          </div>
        </div>
        <div>
          <label>Logo File</label>
          <div class="photo-drop" onclick="document.getElementById('logoFile').click()" id="logoDrop">
            <div style="font-size:32px">🖼️</div>
            <p>Click to upload your logo (PNG, SVG, JPG)</p>
          </div>
          <input type="file" id="logoFile" accept="image/*" style="display:none" onchange="handleLogo(this)">
          <div id="logoPreview" style="margin-top:10px"></div>
          <input type="hidden" name="logo_data" id="logoData">
        </div>
      </div>
    </div>

    <!-- SERVICES -->
    <div class="section">
      <div class="section-title">Services You Offer</div>
      <p style="color:#64748b;font-size:13px;margin-bottom:14px">Check all that apply — we'll build pages for each one.</p>
      <div class="services-grid" id="servicesGrid">
        ${[
          'Emergency Repairs','Drain Cleaning','Water Heater','Pipe Repair',
          'Toilet Repair','Faucet & Fixtures','Garbage Disposal','Sewer Line',
          'Water Softener','Leak Detection','Preventive Maintenance','Commercial',
          'New Construction','Remodeling','Inspections','24/7 Service',
        ].map(s => `
        <div class="service-chip">
          <input type="checkbox" name="services" value="${s}" id="svc_${s.replace(/[^a-z]/gi,'_')}">
          <label for="svc_${s.replace(/[^a-z]/gi,'_')}">${s}</label>
        </div>`).join('')}
      </div>
      <div style="margin-top:12px">
        <label>Other services not listed above</label>
        <input name="services_other" placeholder="e.g. Well Pump Service, Irrigation">
      </div>
    </div>

    <!-- HOURS -->
    <div class="section">
      <div class="section-title">Hours of Operation</div>
      ${['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map(d => `
      <div class="hours-row">
        <span class="day-label">${d.slice(0,3)}</span>
        <input name="hours_open_${d.toLowerCase()}" placeholder="8:00 AM" style="font-size:13px;padding:9px 10px">
        <input name="hours_close_${d.toLowerCase()}" placeholder="5:00 PM" style="font-size:13px;padding:9px 10px">
      </div>`).join('')}
      <div style="margin-top:8px">
        <input type="checkbox" id="emergency247" name="emergency_247" value="true">
        <label for="emergency247" style="display:inline;color:#94a3b8;font-size:13px;cursor:pointer">
          We offer 24/7 emergency service
        </label>
      </div>
    </div>

    <!-- PHOTOS -->
    <div class="section">
      <div class="section-title">Business Photos</div>
      <p style="color:#64748b;font-size:13px;margin-bottom:14px">
        Upload photos of your work, your truck, your team, or your location.
        Real photos make a massive difference. Up to 10 photos.
      </p>
      <div class="photo-drop" id="photoDrop"
        ondragover="event.preventDefault();this.classList.add('drag')"
        ondragleave="this.classList.remove('drag')"
        ondrop="handlePhotoDrop(event)"
        onclick="document.getElementById('photoFiles').click()">
        <div style="font-size:32px">📸</div>
        <p>Drag & drop photos here, or click to browse</p>
        <p style="font-size:12px;margin-top:4px;color:#334155">JPG, PNG — up to 10 photos</p>
      </div>
      <input type="file" id="photoFiles" accept="image/*" multiple style="display:none" onchange="handlePhotoFiles(this.files)">
      <div class="photo-previews" id="photoPreviews"></div>
      <input type="hidden" name="photo_data" id="photoData" value="[]">
    </div>

    <!-- SOCIAL -->
    <div class="section">
      <div class="section-title">Online Presence</div>
      <div class="grid">
        <div>
          <label>Google Business Profile URL</label>
          <input name="google_maps_url" placeholder="https://g.co/..." type="url">
        </div>
        <div>
          <label>Facebook Page URL</label>
          <input name="facebook_url" placeholder="https://facebook.com/..." type="url">
        </div>
        <div>
          <label>Yelp Page URL</label>
          <input name="yelp_url" placeholder="https://yelp.com/biz/..." type="url">
        </div>
      </div>
    </div>

    <!-- NOTES -->
    <div class="section">
      <div class="section-title">Anything Else</div>
      <div>
        <label>Notes for the build team</label>
        <textarea name="notes" rows="4"
          placeholder="Anything specific you want on your site? Certifications, awards, special services, tone of voice, competitors to avoid looking like..."></textarea>
      </div>
    </div>

    <button type="submit" class="submit-btn" id="submitBtn">
      <div class="spinner" id="spinner"></div>
      <span id="submitLabel">Submit My Business Info →</span>
    </button>

    <div class="success" id="successBox">
      <h2>🎉 We got it!</h2>
      <p>Your business information has been submitted. Our build team will review it and reach out within 1-2 business days with your site preview.</p>
    </div>

    <p class="required-note">Fields marked with <span style="color:#f87171">*</span> are required. Everything else helps us build a better site.</p>

  </form>
</div>

<script>
const TOKEN = '${safeToken}';
const API = '${safeApiBase}/api/client-intake?token=' + encodeURIComponent(TOKEN);
const photoDataArr = [];

// ── Logo handler ─────────────────────────────────────────────────────────────
function handleLogo(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    document.getElementById('logoData').value = e.target.result;
    document.getElementById('logoPreview').innerHTML =
      '<img src="' + e.target.result + '" style="max-height:60px;border-radius:8px;margin-top:8px">';
    document.getElementById('logoDrop').style.display = 'none';
  };
  reader.readAsDataURL(file);
}

// ── Photo handlers ────────────────────────────────────────────────────────────
function handlePhotoDrop(e) {
  e.preventDefault();
  document.getElementById('photoDrop').classList.remove('drag');
  handlePhotoFiles(e.dataTransfer.files);
}

function handlePhotoFiles(files) {
  Array.from(files).slice(0, 10 - photoDataArr.length).forEach(file => {
    const reader = new FileReader();
    reader.onload = e => {
      photoDataArr.push(e.target.result);
      document.getElementById('photoData').value = JSON.stringify(photoDataArr);
      const img = document.createElement('img');
      img.src = e.target.result;
      img.className = 'photo-preview';
      document.getElementById('photoPreviews').appendChild(img);
    };
    reader.readAsDataURL(file);
  });
}

// ── Submit ────────────────────────────────────────────────────────────────────
async function handleSubmit(e) {
  e.preventDefault();
  const btn = document.getElementById('submitBtn');
  const spinner = document.getElementById('spinner');
  const label = document.getElementById('submitLabel');
  btn.disabled = true;
  spinner.style.display = 'block';
  label.textContent = 'Submitting…';

  const fd = new FormData(e.target);
  const data = {};

  // Scalar fields
  for (const [k, v] of fd.entries()) {
    if (k !== 'services' && k !== 'photo_data' && k !== 'logo_data') {
      data[k] = v;
    }
  }

  // Services checkboxes
  data.services = fd.getAll('services');
  if (data.services_other) {
    data.services_other.split(',').map(s => s.trim()).filter(Boolean)
      .forEach(s => data.services.push(s));
  }

  // Service area
  data.service_area = (data.service_area_raw || '').split(',').map(s => s.trim()).filter(Boolean);

  // Hours
  const days = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
  data.hours = {};
  days.forEach(d => {
    const open = data['hours_open_' + d];
    const close = data['hours_close_' + d];
    if (open || close) data.hours[d] = { open: open || '', close: close || '' };
    delete data['hours_open_' + d];
    delete data['hours_close_' + d];
  });

  // Logo + photos as base64
  data.logo_data  = document.getElementById('logoData').value;
  data.photo_data = photoDataArr;

  try {
    const res = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (res.ok) {
      document.getElementById('intake').style.display = 'none';
      document.getElementById('successBox').style.display = 'block';
    } else {
      alert('Error: ' + (json.error || 'Submission failed. Please try again.'));
      btn.disabled = false;
      spinner.style.display = 'none';
      label.textContent = 'Submit My Business Info →';
    }
  } catch {
    alert('Network error. Please check your connection and try again.');
    btn.disabled = false;
    spinner.style.display = 'none';
    label.textContent = 'Submit My Business Info →';
  }
}
</script>
</body>
</html>`
}
