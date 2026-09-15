<?php
declare(strict_types=1);

/* ============================================================
 * Bashman Natural Medicine — Admin Dashboard
 *
 * Login: business email + password (defaults below; change the
 * password from the dashboard after first login).
 * Data lives in this folder: config.json (settings) and
 * leads.json (form submissions) — both denied to the web.
 * ============================================================ */

const CONFIG_FILE = __DIR__ . '/config.json';
const LEADS_FILE  = __DIR__ . '/leads.json';
const LEADS_MAX   = 2000;

session_set_cookie_params(['httponly' => true, 'samesite' => 'Lax', 'secure' => isset($_SERVER['HTTPS'])]);
session_start();

/* ---------------- helpers ---------------- */
function h($s): string { return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); }
function now_fmt($ts = null): string { return date('d M Y, H:i', $ts ?: time()); }
function csrf(): string {
  if (empty($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(16));
  return $_SESSION['csrf'];
}
function csrf_ok(): bool { return isset($_POST['csrf']) && hash_equals($_SESSION['csrf'] ?? '', (string)$_POST['csrf']); }
function json_load($file, $default) {
  if (!is_file($file)) return $default;
  $raw = @file_get_contents($file);
  if ($raw === false) return $default;
  $d = json_decode($raw, true);
  return is_array($d) ? $d : $default;
}
function json_save($file, array $data): bool {
  $tmp = $file . '.tmp';
  if (@file_put_contents($tmp, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES)) === false) return false;
  return @rename($tmp, $file);
}
function flash($msg = null, $type = 'ok') {
  if ($msg !== null) { $_SESSION['flash'] = [$type, $msg]; return; }
  if (!empty($_SESSION['flash'])) { [$type, $m] = $_SESSION['flash']; unset($_SESSION['flash']); return [$type, $m]; }
  return null;
}

/* ---------------- config ---------------- */
function config_defaults(): array {
  return [
    'auth_username'      => 'ceo@bashmannaturalmedicine.com',
    'auth_password_hash' => '$2y$10$jeIXWttBsMvIdjq4D2td1Olx4ecoQegStLNVhrALfqGJb/Udctb8q',
    'brand_name'         => 'Bashman Natural Medicine',
    'brand_email'        => 'ceo@bashmannaturalmedicine.com',
    'admin_emails'       => ['ceo@bashmannaturalmedicine.com', 'bashman4u84@gmail.com'],
    'phone_display'      => '+234 806 309 1501',
    'whatsapp_display'   => '08063091501',
    'whatsapp_number'    => '2348063091501',
    'business_hours'     => 'Mon – Sat, 9am – 6pm',
    'meta_pixel_id'      => '',
    'tiktok_pixel_id'    => '',
    'disclaimer'         => 'Complementary wellness, not a substitute for medical care',
  ];
}
function config(): array { return json_load(CONFIG_FILE, config_defaults()); }
function save_config(array $c): bool { return json_save(CONFIG_FILE, $c); }

/* ---------------- leads ---------------- */
function leads(): array {
  $l = json_load(LEADS_FILE, []);
  usort($l, fn($a, $b) => ($b['ts'] ?? 0) <=> ($a['ts'] ?? 0));
  return $l;
}
function save_leads(array $l): bool {
  usort($l, fn($a, $b) => ($b['ts'] ?? 0) <=> ($a['ts'] ?? 0));
  if (count($l) > LEADS_MAX) $l = array_slice($l, 0, LEADS_MAX);
  return json_save(LEADS_FILE, $l);
}

/* ---------------- auth ---------------- */
function is_logged_in(): bool { return !empty($_SESSION['auth']); }
function attempt_login($u, $p): bool {
  $cfg = config();
  $ok = hash_equals(strtolower(trim((string)$cfg['auth_username'])), strtolower(trim($u)))
    && password_verify($p, $cfg['auth_password_hash']);
  if ($ok) {
    session_regenerate_id(true);
    $_SESSION['auth'] = true;
    $_SESSION['login_at'] = time();
    unset($_SESSION['fails'], $_SESSION['lock_until']);
    return true;
  }
  $_SESSION['fails'] = ($_SESSION['fails'] ?? 0) + 1;
  if (($_SESSION['fails'] ?? 0) >= 5) $_SESSION['lock_until'] = time() + 600;
  return false;
}

/* ---------------- actions ---------------- */
$action = $_POST['action'] ?? ($_GET['action'] ?? '');

if ($action === 'logout') {
  $_SESSION = [];
  session_destroy();
  header('Location: /admin/'); exit;
}

if ($action === 'login' && csrf_ok()) {
  if (time() < ($_SESSION['lock_until'] ?? 0)) {
    flash('Too many failed attempts. Try again in a few minutes.', 'err');
  } elseif (attempt_login((string)($_POST['username'] ?? ''), (string)($_POST['password'] ?? ''))) {
    flash('Welcome back.');
    header('Location: /admin/'); exit;
  } else {
    flash('Wrong email or password.', 'err');
  }
}

if (is_logged_in()) {
  if ($action === 'save_settings' && csrf_ok()) {
    $cfg = config();
    $admins = array_filter(array_map('trim', explode("\n", (string)($_POST['admin_emails'] ?? ''))));
    $admins = array_values(array_filter($admins, fn($e) => filter_var($e, FILTER_VALIDATE_EMAIL)));
    if (count($admins) === 0) $admins = config_defaults()['admin_emails'];
    $cfg['brand_name']       = trim((string)($_POST['brand_name'] ?? '')) ?: config_defaults()['brand_name'];
    $cfg['brand_email']      = filter_var(trim((string)($_POST['brand_email'] ?? '')), FILTER_VALIDATE_EMAIL) ?: config_defaults()['brand_email'];
    $cfg['admin_emails']     = $admins;
    $cfg['phone_display']    = trim((string)($_POST['phone_display'] ?? ''));
    $cfg['whatsapp_display'] = trim((string)($_POST['whatsapp_display'] ?? ''));
    $cfg['whatsapp_number']  = preg_replace('/\D/', '', (string)($_POST['whatsapp_number'] ?? ''));
    $cfg['business_hours']   = trim((string)($_POST['business_hours'] ?? ''));
    $cfg['meta_pixel_id']    = trim((string)($_POST['meta_pixel_id'] ?? ''));
    $cfg['tiktok_pixel_id']  = trim((string)($_POST['tiktok_pixel_id'] ?? ''));
    $cfg['disclaimer']       = trim((string)($_POST['disclaimer'] ?? ''));
    flash(save_config($cfg) ? 'Settings saved.' : 'Could not save settings (check permissions).');
    header('Location: /admin/?tab=settings'); exit;
  }

  if ($action === 'change_password' && csrf_ok()) {
    $cfg = config();
    $old = (string)($_POST['old_password'] ?? '');
    $new = (string)($_POST['new_password'] ?? '');
    $new2 = (string)($_POST['new_password2'] ?? '');
    if (!password_verify($old, $cfg['auth_password_hash'])) {
      flash('Current password is incorrect.', 'err');
    } elseif (strlen($new) < 8) {
      flash('New password must be at least 8 characters.', 'err');
    } elseif ($new !== $new2) {
      flash('New passwords do not match.', 'err');
    } else {
      $cfg['auth_password_hash'] = password_hash($new, PASSWORD_BCRYPT);
      flash(save_config($cfg) ? 'Password updated.' : 'Could not save (check permissions).', 'err');
    }
    header('Location: /admin/?tab=password'); exit;
  }

  if ($action === 'lead_status' && csrf_ok()) {
    $id = (string)($_POST['id'] ?? '');
    $st = in_array(($_POST['status'] ?? ''), ['new', 'contacted', 'done'], true) ? $_POST['status'] : 'new';
    $all = leads();
    foreach ($all as $k => $l) if ((string)$l['id'] === $id) { $all[$k]['status'] = $st; break; }
    save_leads($all);
    header('Location: /admin/?tab=leads' . (isset($_GET['filter']) ? '&filter=' . urlencode($_GET['filter']) : '')); exit;
  }

  if ($action === 'lead_delete' && csrf_ok()) {
    $id = (string)($_POST['id'] ?? '');
    $all = array_values(array_filter(leads(), fn($l) => (string)$l['id'] !== $id));
    save_leads($all);
    header('Location: /admin/?tab=leads'); exit;
  }
}

/* ---------------- render ---------------- */
if (!is_logged_in()) { render_login(); exit; }
render_dashboard();

function render_login(): void {
  $err = flash(); $c = config();
  ?>
<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex">
<meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Admin Login — <?=h($c['brand_name'])?></title>
<style>
 *{margin:0;padding:0;box-sizing:border-box}
 body{font-family:'Segoe UI',system-ui,Arial,sans-serif;background:#0b1f16;color:#f6f1e7;min-height:100vh;display:grid;place-items:center;padding:24px}
 .card{background:#12382a;border:1px solid rgba(232,201,106,.25);border-radius:20px;padding:38px 34px;width:100%;max-width:400px;box-shadow:0 40px 80px -40px rgba(0,0,0,.7)}
 .logo{width:64px;height:64px;border-radius:50%;object-fit:cover;display:block;margin:0 auto 14px}
 h1{font-family:Georgia,serif;font-size:22px;text-align:center;color:#e8c96a;margin-bottom:4px}
 p.sub{text-align:center;font-size:13px;color:#9fb2a6;margin-bottom:26px}
 label{display:block;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#e8c96a;font-weight:700;margin:16px 0 6px}
 input{width:100%;padding:13px 15px;border-radius:10px;border:1px solid rgba(246,241,231,.18);background:rgba(255,255,255,.07);color:#f6f1e7;font-size:15px;outline:none}
 input:focus{border-color:#e8c96a}
 .btn{width:100%;margin-top:22px;padding:14px;border:0;border-radius:999px;background:linear-gradient(135deg,#e8c96a,#c9a227);color:#211a04;font-weight:800;font-size:15px;cursor:pointer}
 .err{background:rgba(179,53,47,.18);border:1px solid rgba(255,150,140,.4);color:#ffd9d4;padding:10px 14px;border-radius:10px;font-size:13px;margin-bottom:14px;text-align:center}
 .ok{background:rgba(63,163,114,.18);border:1px solid rgba(120,220,160,.4);color:#d6f4e3;padding:10px 14px;border-radius:10px;font-size:13px;margin-bottom:14px;text-align:center}
</style></head><body>
<div class="card">
  <img class="logo" src="/media/logo-mark.png" alt="">
  <h1>Admin Dashboard</h1>
  <p class="sub"><?=h($c['brand_name'])?></p>
  <?php if ($err) echo '<div class="'.h($err[0]).'">'.h($err[1]).'</div>'; ?>
  <form method="post">
    <input type="hidden" name="action" value="login"><input type="hidden" name="csrf" value="<?=h(csrf())?>">
    <label>Business email</label><input type="email" name="username" autocomplete="username" required autofocus>
    <label>Password</label><input type="password" name="password" autocomplete="current-password" required>
    <button class="btn" type="submit">Sign in</button>
  </form>
</div></body></html>
<?php }

function render_dashboard(): void {
  $cfg = config(); $all = leads();
  $today = 0; $new = 0;
  foreach ($all as $l) { if (date('Y-m-d', $l['ts'] ?? 0) === date('Y-m-d')) $today++; if (($l['status'] ?? 'new') === 'new') $new++; }
  $perPage = [];
  foreach ($all as $l) { $pg = $l['page'] ?? 'unknown'; $perPage[$pg] = ($perPage[$pg] ?? 0) + 1; }
  arsort($perPage);
  $tab = $_GET['tab'] ?? ((($_GET['action'] ?? '') === 'leads') ? 'leads' : 'overview');
  $filter = (string)($_GET['filter'] ?? '');
  $flash = flash();
  ?>
<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex">
<meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Dashboard — <?=h($cfg['brand_name'])?></title>
<style>
 *{margin:0;padding:0;box-sizing:border-box}
 body{font-family:'Segoe UI',system-ui,Arial,sans-serif;background:#f7f2e9;color:#12211a;font-size:14.5px}
 header{background:#0b1f16;color:#f6f1e7;padding:0 24px;height:64px;display:flex;align-items:center;justify-content:space-between;gap:16px}
 header .brand{display:flex;align-items:center;gap:12px;font-family:Georgia,serif;font-size:17px;color:#e8c96a}
 header img{width:38px;height:38px;border-radius:50%}
 header .who{font-size:13px;color:#9fb2a6}
 header .who b{color:#f6f1e7}
 header form{display:inline}
 .logout-btn{background:none;border:1px solid rgba(246,241,231,.25);color:#f6f1e7;padding:8px 16px;border-radius:999px;cursor:pointer;font-size:13px;font-weight:700}
 nav{background:#12382a;display:flex;gap:6px;padding:10px 24px;flex-wrap:wrap}
 nav a{color:#cfe3d7;text-decoration:none;padding:9px 18px;border-radius:999px;font-weight:700;font-size:13.5px}
 nav a.active{background:#c9a227;color:#211a04}
 main{max-width:1080px;margin:26px auto;padding:0 20px}
 .cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:14px;margin-bottom:26px}
 .card{background:#fff;border:1px solid rgba(18,33,26,.1);border-radius:16px;padding:18px}
 .card .num{font-family:Georgia,serif;font-size:30px;color:#1e6a4b;line-height:1}
 .card .lab{font-size:12px;letter-spacing:.07em;text-transform:uppercase;color:#5c6b61;font-weight:700;margin-top:6px}
 .panel{background:#fff;border:1px solid rgba(18,33,26,.1);border-radius:18px;padding:22px;margin-bottom:22px}
 .panel h2{font-family:Georgia,serif;font-size:20px;margin-bottom:14px;color:#0b1f16}
 .flash-ok{background:#dcefe3;border:1px solid rgba(63,163,114,.4);color:#12382a;padding:11px 16px;border-radius:12px;margin-bottom:18px;font-weight:700}
 .flash-err{background:#fbe4e1;border:1px solid rgba(179,53,47,.35);color:#8f2a25;padding:11px 16px;border-radius:12px;margin-bottom:18px;font-weight:700}
 table{width:100%;border-collapse:collapse}
 th{text-align:left;font-size:11.5px;letter-spacing:.07em;text-transform:uppercase;color:#5c6b61;padding:10px 8px;border-bottom:2px solid rgba(18,33,26,.1)}
 td{padding:12px 8px;border-bottom:1px solid rgba(18,33,26,.06);vertical-align:top}
 tr:hover td{background:#faf7ef}
 .tag{display:inline-block;padding:3px 10px;border-radius:999px;font-size:11.5px;font-weight:800;text-transform:uppercase}
 .tag.new{background:#dcefe3;color:#1e6a4b}.tag.contacted{background:#f6eed3;color:#9a7a15}.tag.done{background:#e7eef2;color:#2c5a73}
 select{font:inherit;padding:5px 8px;border-radius:8px;border:1px solid rgba(18,33,26,.2);background:#fff}
 .btn-mini{font:inherit;font-size:12.5px;padding:5px 10px;border-radius:8px;border:1px solid rgba(179,53,47,.35);color:#8f2a25;background:#fff;cursor:pointer}
 .btn{background:linear-gradient(135deg,#e8c96a,#c9a227);color:#211a04;border:0;padding:12px 26px;border-radius:999px;font-weight:800;font-size:14px;cursor:pointer}
 .btn.ghost{background:#fff;border:1px solid rgba(18,33,26,.2);color:#12211a}
 .form-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
 .field label{display:block;font-size:11.5px;letter-spacing:.07em;text-transform:uppercase;color:#5c6b61;font-weight:800;margin-bottom:6px}
 .field input,.field textarea{width:100%;padding:11px 13px;border-radius:10px;border:1px solid rgba(18,33,26,.18);font:inherit;background:#fff}
 .field input:focus,.field textarea:focus{outline:none;border-color:#1e6a4b}
 .field textarea{min-height:90px;resize:vertical}
 .field.full{grid-column:1/-1}
 .row{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-top:16px}
 .kv{font-size:13.5px}
 .kv b{color:#1e6a4b}
 .muted{color:#5c6b61;font-size:13px}
 .help{font-size:12.5px;color:#8a938d;margin-top:4px}
 a.lk{color:#1e6a4b;font-weight:700;text-decoration:none}
 .empty{padding:26px;text-align:center;color:#5c6b61}
 @media(max-width:720px){.form-grid{grid-template-columns:1fr}main{padding:0 14px}header{padding:0 14px}th:nth-child(3),td:nth-child(3){display:none}}
</style></head><body>
<header>
  <div class="brand"><img src="/media/logo-mark.png" alt=""><span>Bashman Admin</span></div>
  <div style="display:flex;align-items:center;gap:14px">
    <span class="who">Signed in as <b><?=h($cfg['auth_username'])?></b></span>
    <form method="post"><input type="hidden" name="action" value="logout"><button class="logout-btn" type="submit">Sign out</button></form>
  </div>
</header>
<nav>
  <a href="/admin/?tab=overview" class="<?=$tab==='overview'?'active':''?>">Overview</a>
  <a href="/admin/?tab=leads" class="<?=$tab==='leads'?'active':''?>">Leads (<?=count($all)?>)</a>
  <a href="/admin/?tab=settings" class="<?=$tab==='settings'?'active':''?>">Settings</a>
  <a href="/admin/?tab=password" class="<?=$tab==='password'?'active':''?>">Change password</a>
</nav>
<main>
<?php if ($flash) echo '<div class="flash-'.$flash[0].'">'.h($flash[1]).'</div>'; ?>

<?php if ($tab === 'overview'): ?>
  <div class="cards">
    <div class="card"><div class="num"><?=count($all)?></div><div class="lab">Total leads</div></div>
    <div class="card"><div class="num"><?=$new?></div><div class="lab">Unhandled (new)</div></div>
    <div class="card"><div class="num"><?=$today?></div><div class="lab">Leads today</div></div>
    <div class="card"><div class="num"><?=count($cfg['admin_emails'])?></div><div class="lab">Notify emails</div></div>
  </div>
  <div class="panel">
    <h2>Leads by page</h2>
    <?php if ($perPage): ?>
    <table><tr><th>Ad / page</th><th>Leads</th><th>Open</th></tr>
    <?php foreach ($perPage as $pg => $n): $op=0; foreach($all as $l){ if(($l['page']??'')===$pg && ($l['status']??'')==='new') $op++; } ?>
      <tr><td><a class="lk" href="/admin/?tab=leads&filter=<?=h(urlencode($pg))?>"><?=h($pg)?></a></td><td><b><?=$n?></b></td><td><?=$op?></td></tr>
    <?php endforeach; ?>
    </table>
    <?php else: ?><p class="empty">No leads yet. They will appear here when someone submits a form or starts a WhatsApp chat.</p><?php endif; ?>
  </div>
  <div class="panel">
    <h2>Current contact variables</h2>
    <div class="form-grid">
      <div class="field"><label>Business email (sender)</label><div class="kv"><b><?=h($cfg['brand_email'])?></b></div></div>
      <div class="field"><label>Phone display</label><div class="kv"><b><?=h($cfg['phone_display'])?></b></div></div>
      <div class="field"><label>WhatsApp number</label><div class="kv"><b><?=h($cfg['whatsapp_display'])?></b> (<?=h($cfg['whatsapp_number'])?>)</div></div>
      <div class="field"><label>Business hours</label><div class="kv"><b><?=h($cfg['business_hours'])?></b></div></div>
      <div class="field full"><label>Pixel IDs</label><div class="kv muted">Meta: <?=h($cfg['meta_pixel_id'] ?: '—')?> · TikTok: <?=h($cfg['tiktok_pixel_id'] ?: '—')?></div></div>
    </div>
    <div class="row"><a class="btn" href="/admin/?tab=settings">Edit variables</a></div>
  </div>
  <div class="panel">
    <h2>Quick links</h2>
    <div class="row">
      <a class="btn ghost" href="https://bashmannaturalmedicine.com/" target="_blank">View site</a>
      <a class="btn ghost" href="https://wa.me/<?=h($cfg['whatsapp_number'])?>" target="_blank">Open WhatsApp</a>
      <a class="btn ghost" href="mailto:<?=h($cfg['admin_emails'][0] ?? '')?>" target="_blank">Mailbox</a>
    </div>
    <p class="muted" style="margin-top:12px">Server time: <?=h(now_fmt())?> · PHP <?=PHP_VERSION?></p>
  </div>

<?php elseif ($tab === 'leads'): ?>
  <?php
    $list = $all;
    if ($filter) $list = array_values(array_filter($list, fn($l) => ($l['page'] ?? '') === $filter));
    $show = array_slice($list, 0, 200);
  ?>
  <div class="panel">
    <div class="row" style="margin-top:0">
      <h2 style="margin:0;flex:1">Consultation leads <?=$filter ? '— '.h($filter) : ''?></h2>
      <?php if ($filter): ?><a class="btn ghost" href="/admin/?tab=leads">Clear filter</a><?php endif; ?>
    </div>
    <?php if ($show): ?>
    <table>
      <tr><th>Date</th><th>Name</th><th>Contact</th><th>Condition / Page</th><th>Message</th><th>Status</th><th></th></tr>
      <?php foreach ($show as $l): $id=(string)$l['id']; ?>
      <tr>
        <td class="muted"><?=h(now_fmt($l['ts'] ?? null))?></td>
        <td><b><?=h($l['name'] ?? '')?></b></td>
        <td>
          <a class="lk" href="tel:<?=h($l['phone'] ?? '')?>"><?=h($l['phone'] ?? '')?></a><br>
          <?php if (!empty($l['email'])): ?><a class="lk" href="mailto:<?=h($l['email'])?>"><?=h($l['email'])?></a><?php endif; ?>
        </td>
        <td>
          <span class="muted"><?=h($l['condition'] ?: '—')?></span><br>
          <span class="muted" style="font-size:12px"><?=h($l['page'] ?? '')?></span>
        </td>
        <td class="muted" style="max-width:230px"><?=h(mb_substr($l['message'] ?? '', 0, 120))?></td>
        <td>
          <form method="post" style="display:inline">
            <input type="hidden" name="action" value="lead_status"><input type="hidden" name="csrf" value="<?=h(csrf())?>">
            <input type="hidden" name="id" value="<?=h($id)?>">
            <select name="status" onchange="this.form.submit()">
              <?php foreach (['new','contacted','done'] as $s): ?><option value="<?=$s?>" <?=($l['status']??'')===$s?'selected':''?>><?=$s?></option><?php endforeach; ?>
            </select>
          </form>
        </td>
        <td>
          <form method="post" onsubmit="return confirm('Delete this lead?')">
            <input type="hidden" name="action" value="lead_delete"><input type="hidden" name="csrf" value="<?=h(csrf())?>">
            <input type="hidden" name="id" value="<?=h($id)?>"><button class="btn-mini" type="submit">✕</button>
          </form>
        </td>
      </tr>
      <?php endforeach; ?>
    </table>
    <?php else: ?><p class="empty">No leads<?=$filter?' for this page':''?> yet.</p><?php endif; ?>
  </div>

<?php elseif ($tab === 'settings'): ?>
  <form method="post">
    <input type="hidden" name="action" value="save_settings"><input type="hidden" name="csrf" value="<?=h(csrf())?>">
    <div class="panel"><h2>Contact &amp; brand variables</h2>
      <div class="form-grid">
        <div class="field"><label>Brand name</label><input name="brand_name" value="<?=h($cfg['brand_name'])?>"></div>
        <div class="field"><label>Business email (sender)</label><input type="email" name="brand_email" value="<?=h($cfg['brand_email'])?>"></div>
        <div class="field"><label>Phone display</label><input name="phone_display" value="<?=h($cfg['phone_display'])?>"></div>
        <div class="field"><label>WhatsApp number (intl, digits)</label><input name="whatsapp_number" value="<?=h($cfg['whatsapp_number'])?>"></div>
        <div class="field"><label>WhatsApp display</label><input name="whatsapp_display" value="<?=h($cfg['whatsapp_display'])?>"></div>
        <div class="field"><label>Business hours</label><input name="business_hours" value="<?=h($cfg['business_hours'])?>"></div>
        <div class="field full"><label>Admin notification emails (one per line)</label><textarea name="admin_emails"><?=h(implode("\n", $cfg['admin_emails']))?></textarea>
          <div class="help">Form submissions notify everyone listed here.</div></div>
      </div>
    </div>
    <div class="panel"><h2>Ad pixels</h2>
      <div class="form-grid">
        <div class="field"><label>Meta (Facebook) Pixel ID</label><input name="meta_pixel_id" value="<?=h($cfg['meta_pixel_id'])?>"><div class="help">Paste your 15-digit Pixel ID.</div></div>
        <div class="field"><label>TikTok Pixel ID</label><input name="tiktok_pixel_id" value="<?=h($cfg['tiktok_pixel_id'])?>"><div class="help">Paste your TikTok Pixel ID.</div></div>
      </div>
      <div class="help">Note: the static landing pages still need the placeholder IDs replaced in each HTML file — this stores them as a record. Live pixel injection from the dashboard is not wired to the static pages yet.</div>
    </div>
    <div class="panel"><h2>Email footer</h2>
      <div class="field"><label>Disclaimer line</label><input name="disclaimer" value="<?=h($cfg['disclaimer'])?>"></div>
    </div>
    <div class="row"><button class="btn" type="submit">Save settings</button></div>
  </form>

<?php elseif ($tab === 'password'): ?>
  <form method="post">
    <input type="hidden" name="action" value="change_password"><input type="hidden" name="csrf" value="<?=h(csrf())?>">
    <div class="panel" style="max-width:520px">
      <h2>Change password</h2>
      <div class="field" style="margin-bottom:14px"><label>Current password</label><input type="password" name="old_password" autocomplete="current-password" required></div>
      <div class="field" style="margin-bottom:14px"><label>New password (min 8 chars)</label><input type="password" name="new_password" autocomplete="new-password" required></div>
      <div class="field"><label>Confirm new password</label><input type="password" name="new_password2" autocomplete="new-password" required></div>
      <div class="row"><button class="btn" type="submit">Update password</button></div>
    </div>
  </form>
<?php endif; ?>
</main>
</body></html>
<?php }