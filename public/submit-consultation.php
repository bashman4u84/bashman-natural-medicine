<?php
/* ============================================================
 * Bashman Natural Medicine — consultation form handler
 *
 * POST from any site form →
 *   1. admin notification to ceo@bashmannaturalmedicine.com
 *      and bashman4u84@gmail.com (Reply-To set to the visitor)
 *   2. warm confirmation email to the visitor, From:
 *      ceo@bashmannaturalmedicine.com
 *
 * Both are professionally branded, multi-part (plain text +
 * HTML) emails. Answers JSON: { ok, visitorNotified }
 * ============================================================ */
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  http_response_code(405);
  echo json_encode(['ok' => false, 'error' => 'Method not allowed']);
  exit;
}

/* honeypot — real visitors never see/fill this; bots do */
if (!empty($_POST['website'])) {
  echo json_encode(['ok' => true]);
  exit;
}

$sub = function_exists('mb_substr') ? 'mb_substr' : 'substr';
$clean = function ($key, $max = 1000) use ($sub) {
  $v = trim((string)($_POST[$key] ?? ''));
  $v = strip_tags($v);
  return $sub($v, 0, $max);
};
$cleanLine = function ($key, $max = 200) use ($clean) {
  return str_replace(["\r", "\n"], ' ', $clean($key, $max));
};

$name      = $cleanLine('name', 120);
$phone     = $cleanLine('phone', 60);
$emailRaw  = $cleanLine('email', 200);
$email     = filter_var($emailRaw, FILTER_VALIDATE_EMAIL) ? $emailRaw : '';
$condition = $cleanLine('condition', 120);
$method    = $cleanLine('method', 60);
$message   = $clean('message', 3000);
$page      = $cleanLine('page', 200);

if ($name === '' || $phone === '') {
  http_response_code(422);
  echo json_encode(['ok' => false, 'error' => 'Please provide your name and phone number.']);
  exit;
}

/* ---------- settings (shared with the admin dashboard) ---------- */
function _cfg_defaults() {
  return [
    'brand_name'      => 'Bashman Natural Medicine',
    'brand_email'     => 'ceo@bashmannaturalmedicine.com',
    'admin_emails'    => ['ceo@bashmannaturalmedicine.com', 'bashman4u84@gmail.com'],
    'phone_display'   => '+234 806 309 1501',
    'whatsapp_display'=> '08063091501',
    'whatsapp_number' => '2348063091501',
    'business_hours'  => 'Mon – Sat, 9am – 6pm',
    'disclaimer'      => 'Complementary wellness, not a substitute for medical care',
  ];
}
function _cfg() {
  $f = __DIR__ . '/admin/config.json';
  if (is_file($f)) { $d = json_decode((string)@file_get_contents($f), true); if (is_array($d)) return array_merge(_cfg_defaults(), $d); }
  return _cfg_defaults();
}
$CFG = _cfg();

/* WhatsApp deep-link from the visitor's phone (0xxx → 234xxx) */
$waDigits = preg_replace('/\D/', '', $phone);
if (substr($waDigits, 0, 1) === '0') $waDigits = '234' . substr($waDigits, 1);
if (strlen($waDigits) < 8) $waDigits = $CFG['whatsapp_number'];
$waLink = 'https://wa.me/' . $waDigits;

$BRAND  = $CFG['brand_name'];
$SENDER = $CFG['brand_email'];
$ADMINS = array_filter(array_values($CFG['admin_emails']));
if (count($ADMINS) === 0) $ADMINS = ['ceo@bashmannaturalmedicine.com'];
$site   = 'https://bashmannaturalmedicine.com';
$LOGOLIGHT = $site . '/media/logo-light.png';

$subjEnc = function ($s) { return '=?UTF-8?B?' . base64_encode($s) . '?='; };

/* CID-embedded logo: attachment rendered without any remote fetch,
 * so it shows even in clients that block remote images (default in
 * Gmail, Outlook and Apple Mail). Falls back to the hosted URL. */
$logoPath = __DIR__ . '/media/logo-light.png';
$logoB64  = is_readable($logoPath) ? base64_encode((string)file_get_contents($logoPath)) : '';
$logoSrc  = $logoB64 !== '' ? 'cid:logo' : $LOGOLIGHT;

/* ---------- shared HTML shell ---------- */
function shell($inner, $logoSrc, $site) {
  global $CFG;
  $t = function ($s) { return htmlspecialchars($s, ENT_QUOTES, 'UTF-8'); };
  $footNote = $t($CFG['disclaimer']);
  $logoH = $logoSrc . '" width="220" alt="' . $t('Bashman Natural Medicine') . '" style="display:block;margin:0 auto;max-width:220px';
  return <<<HTML
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f7f2e9;-webkit-text-size-adjust:100%;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f2e9;padding:24px 0;">
<tr><td align="center">
<table role="presentation" width="620" cellpadding="0" cellspacing="0" style="width:620px;max-width:100%;">
<!-- forest header with light logo -->
<tr><td bgcolor="#0b1f16" style="background-color:#0b1f16;padding:30px 24px;border-radius:18px 18px 0 0;text-align:center;">
<img src="{$logoH}">
</td></tr>
<!-- white card -->
<tr><td bgcolor="#ffffff" style="background-color:#ffffff;padding:32px 36px;">
{$inner}
</td></tr>
<!-- gold accent -->
<tr><td height="6" bgcolor="#c9a227" style="background-color:#c9a227;font-size:0;line-height:0;">&nbsp;</td></tr>
<!-- footer -->
<tr><td bgcolor="#0b1f16" style="background-color:#0b1f16;padding:26px 24px;border-radius:0 0 18px 18px;text-align:center;">
<p style="margin:0 0 8px;font-family:Georgia,'Times New Roman',serif;font-size:15px;color:#f6f1e7;">Bashman Natural Medicine</p>
<p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.7;color:#9fb2a6;">
Healed by nature &middot; Guided by the Sunnah<br>
Mon &ndash; Sat, 9am &ndash; 6pm<br>
<a href="tel:+2348063091501" style="color:#e8c96a;text-decoration:none;">+234 806 309 1501</a> &nbsp;|&nbsp;
<a href="mailto:ceo@bashmannaturalmedicine.com" style="color:#e8c96a;text-decoration:none;">ceo@bashmannaturalmedicine.com</a>
</p>
<p style="margin:12px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:10.5px;color:#5e7263;">
&copy; 2026 Bashman Natural Medicine &middot; {$footNote}
</p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>
HTML;
}

/* ---------- MIME builders ---------- */
function mimeBody($text, $html, $logoB64) {
  $alt = "--bmboundary\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n"
    . rtrim(chunk_split(base64_encode($text))) . "\r\n"
    . "--bmboundary\r\nContent-Type: text/html; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n"
    . rtrim(chunk_split(base64_encode($html))) . "\r\n"
    . "--bmboundary--\r\n";
  if ($logoB64 === '') return $alt;
  return "--brel\r\nContent-Type: multipart/alternative; boundary=\"bmboundary\"\r\n\r\n"
    . $alt
    . "--brel\r\nContent-Type: image/png; name=\"bashman-logo.png\"\r\n"
    . "Content-Transfer-Encoding: base64\r\n"
    . "Content-ID: <logo>\r\n"
    . "Content-Disposition: inline; filename=\"bashman-logo.png\"\r\n\r\n"
    . rtrim(chunk_split($logoB64)) . "\r\n"
    . "--brel--\r\n";
}

/* ---------- reusable pieces ---------- */
function cardBtn($href, $label, $bg, $fg) {
  return '<a href="' . htmlspecialchars($href, ENT_QUOTES, 'UTF-8') . '"' .
    ' style="display:inline-block;padding:12px 26px;border-radius:999px;background:' . $bg .
    ';color:' . $fg . ';font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;text-decoration:none;margin:6px 4px;">' .
    htmlspecialchars($label) . '</a>';
}
function h($s) { return htmlspecialchars($s, ENT_QUOTES, 'UTF-8'); }

$esc = function ($s) { return h($s); };

/* ============================================================
 * 1. ADMIN NOTIFICATION
 * ============================================================ */
$subject = 'New consultation request — ' . $name . ($condition !== '' ? " ($condition)" : '');

$text = "A new consultation request arrived via the website.\n\n"
  . "Name:        $name\nPhone:       $phone\nEmail:       " . ($email ?: '—') . "\n"
  . "Condition:   " . ($condition ?: '—') . "\nContact via: " . ($method ?: '—') . "\n"
  . "Message:     " . ($message ?: '—') . "\n\nPage: " . ($page ?: 'unknown') . "\n"
  . "Time: " . date('D, d M Y, H:i') . " (server time)\n";

$detailRow = function ($label, $val) {
  return '<tr><td width="130" valign="top" style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#5c6b61;padding:7px 0;letter-spacing:0.04em;text-transform:uppercase;font-weight:bold;">'
    . $label . '</td><td style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#12211a;padding:7px 0;">'
    . ($val === '' ? '&mdash;' : $val) . '</td></tr>';
};

$inner = '
<h2 style="font-family:Georgia,\'Times New Roman\',serif;font-size:26px;color:#0b1f16;margin:0 0 6px;">New consultation request</h2>
<p style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#5c6b61;margin:0 0 20px;">A patient just sent in their details from the website. Reply within a few hours during work time.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5dfd2;border-radius:12px;padding:6px 14px;margin-bottom:22px;">'
  . $detailRow('Name', h($name))
  . $detailRow('Phone', h($phone))
  . $detailRow('Email', $email ? '<a href="mailto:' . h($email) . '" style="color:#1e6a4b;font-weight:bold;">' . h($email) . '</a>' : '—')
  . $detailRow('Condition', h($condition) ?: '—')
  . $detailRow('Contact via', h($method) ?: '—')
  . $detailRow('Page', h($page) ?: 'unknown')
  . $detailRow('Time', date('d M Y, H:i'))
  . '</table>'
  . ($message ? '<p style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#12211a;background:#f7f2e9;border-radius:12px;padding:16px 18px;margin:0 0 22px;"><strong style="color:#0b1f16;">Message:</strong><br>' . nl2br(h($message)) . '</p>' : '')
  . '<p style="font-family:Arial,Helvetica,sans-serif;margin:0 0 6px;">' . cardBtn($waLink, 'Reply on WhatsApp', '#25d366', '#ffffff') . '</p>'
  . ($email ? '<p style="font-family:Arial,Helvetica,sans-serif;margin:0;">' . cardBtn('mailto:' . h($email), 'Reply by Email', '#1e6a4b', '#ffffff') . '</p>' : '');

$html = shell($inner, $logoSrc, $site);

$adminHeaders = [
  'From: ' . $BRAND . ' <' . $SENDER . '>',
  'MIME-Version: 1.0',
  'X-Mailer: PHP/' . PHP_VERSION,
];
if ($email !== '') $adminHeaders[] = 'Reply-To: ' . $email;
$body = "This is a multi-part message in MIME format.\r\n"
  . mimeBody($text, $html, $logoB64);
$adminHeaders[] = $logoB64 !== ''
  ? 'Content-Type: multipart/related; boundary="brel"'
  : 'Content-Type: multipart/alternative; boundary="bmboundary"';

$adminOk = true;
foreach ($ADMINS as $to) {
  $adminOk = mail($to, $subjEnc($subject), $body, implode("\r\n", $adminHeaders), '-f ' . $SENDER) && $adminOk;
}

/* ============================================================
 * 2. VISITOR CONFIRMATION
 * ============================================================ */
$visitorOk = null;
if ($email !== '') {
  $vSubject = 'We have received your request — Bashman Natural Medicine';
  $vText = "As salaamu alaikum $name,\n\n"
    . "Thank you for reaching out to Bashman Natural Medicine. Your consultation request"
    . ($condition !== '' ? " regarding \"$condition\"" : '') . " has been received.\n\n"
    . "A member of our care team will contact you shortly — usually within a few hours during work time ({$CFG['business_hours']}).\n\n"
    . "Need us sooner?\nWhatsApp: $waLink\nPhone: {$CFG['phone_display']}\nEmail: {$CFG['brand_email']}\n\n"
    . "Healed by nature · Guided by the Sunnah\n— {$CFG['brand_name']}\n";

  $inner = '
<p style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#5c6b61;margin:0 0 18px;">As salaamu alaikum <strong style="color:#12211a;">' . h($name) . '</strong>,</p>
<h2 style="font-family:Georgia,\'Times New Roman\',serif;font-size:24px;color:#0b1f16;margin:0 0 10px;">Your request is in safe hands</h2>
<p style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#5c6b61;line-height:1.75;margin:0 0 22px;">Thank you for placing your trust in us. Your consultation request'
    . ($condition !== '' ? ' regarding <strong style="color:#1e6a4b;">' . h($condition) . '</strong>' : '') . ' has been received and placed with our care desk.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
<tr><td valign="top" style="width:38px;padding:0 0 16px;"><span style="display:block;width:26px;height:26px;border-radius:50%;background:#dcefe3;color:#1e6a4b;font-family:Arial,sans-serif;font-size:13px;font-weight:bold;text-align:center;line-height:26px;">1</span></td><td style="font-family:Arial,sans-serif;font-size:13.5px;color:#12211a;padding:3px 0 16px;"><strong>Your request is read personally</strong><br><span style="color:#5c6b61;">Not an autoresponder — a real member of the care team reviews it.</span></td></tr>
<tr><td valign="top" style="width:38px;padding:0 0 16px;"><span style="display:block;width:26px;height:26px;border-radius:50%;background:#dcefe3;color:#1e6a4b;font-family:Arial,sans-serif;font-size:13px;font-weight:bold;text-align:center;line-height:26px;">2</span></td><td style="font-family:Arial,sans-serif;font-size:13.5px;color:#12211a;padding:3px 0 16px;"><strong>We reach you within hours</strong><br><span style="color:#5c6b61;">Work-time hours are Mon–Sat, 9am–6pm — often sooner on WhatsApp.</span></td></tr>
<tr><td valign="top" style="width:38px;"><span style="display:block;width:26px;height:26px;border-radius:50%;background:#f6eed3;color:#9a7a15;font-family:Arial,sans-serif;font-size:13px;font-weight:bold;text-align:center;line-height:26px;">3</span></td><td style="font-family:Arial,sans-serif;font-size:13.5px;color:#12211a;padding:3px 0;"><strong>We begin your case file</strong><br><span style="color:#5c6b61;">Your history and lab results (if shared) stay strictly confidential.</span></td></tr>
</table>
<p style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#5c6b61;margin:0 0 8px;">Need us sooner? Reach us directly:</p>
<p style="font-family:Arial,Helvetica,sans-serif;margin:0;">'
    . cardBtn($waLink, 'Chat on WhatsApp', '#25d366', '#ffffff')
    . cardBtn('tel:' . preg_replace('/\D/', '', $CFG['phone_display']), 'Call us', '#0b1f16', '#f6f1e7')
    . cardBtn('mailto:' . $CFG['brand_email'], 'Email us', '#f3e3ae', '#211a04') . '</p>';

  $vHtml = shell($inner, $logoSrc, $site);
  $vBody = "This is a multi-part message in MIME format.\r\n"
    . mimeBody($vText, $vHtml, $logoB64);
  $vHeaders = [
    'From: ' . $BRAND . ' <' . $SENDER . '>',
    'Reply-To: ' . $SENDER,
    'MIME-Version: 1.0',
    'X-Mailer: PHP/' . PHP_VERSION,
  ];
  $vHeaders[] = $logoB64 !== ''
    ? 'Content-Type: multipart/related; boundary="brel"'
    : 'Content-Type: multipart/alternative; boundary="bmboundary"';
  $visitorOk = mail($email, $subjEnc($vSubject), $vBody, implode("\r\n", $vHeaders), '-f ' . $SENDER);
}

/* ---------- 3. log the lead for the admin dashboard ---------- */
$leadsFile = __DIR__ . '/admin/leads.json';
$leads = [];
if (is_file($leadsFile)) { $d = json_decode((string)@file_get_contents($leadsFile), true); if (is_array($d)) $leads = $d; }
$leads[] = [
  'id'        => bin2hex(random_bytes(6)),
  'ts'        => time(),
  'name'      => $name,
  'phone'     => $phone,
  'email'     => $email,
  'condition' => $condition,
  'method'    => $method,
  'message'   => $message,
  'page'      => $page,
  'ip'        => substr((string)($_SERVER['REMOTE_ADDR'] ?? ''), 0, 45),
  'status'    => 'new',
];
$leads = array_slice($leads, -2000);
$leadLog = json_save($leadsFile, $leads); // quiet failure ok

echo json_encode(['ok' => (bool)$adminOk, 'visitorNotified' => $visitorOk === true]);

function json_save($file, array $data): bool {
  $tmp = $file . '.tmp';
  if (@file_put_contents($tmp, json_encode($data, JSON_UNESCAPED_SLASHES)) === false) return false;
  return @rename($tmp, $file);
}
