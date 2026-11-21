#!/usr/bin/env node
/**
 * Non-vacuity proof for the live buy-path guard (GP-638): each rule must FIRE on the fault
 * measured 8 Oct 2026 and STAY SILENT on the clean colours measured 12 Oct 2026.
 */
import assert from 'node:assert/strict';

import {
  blockBrowserRequest,
  contrastRatio,
  failureSummary,
  findLocalOrigins,
  isPrivateHost,
  isUnreadable,
  judgeContrast,
  QUICK_ENROL_CARD_ATTR,
  QUICK_ENROL_CARD_SELECTOR,
  redirectDecision,
  summarise,
} from './check-live-buy-path.mjs';

let failures = 0;
function check(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (e) {
    failures += 1;
    console.error(`  ✗ ${name}\n    ${e.message}`);
  }
}

check('fires on the 8 Oct sign-out redirect', () => {
  assert.deepEqual(findLocalOrigins('http://localhost:8080/login'), ['http://localhost:8080']);
});
check('fires on local origins inside HTML', () => {
  const html =
    '<a href="https://localhost:8080/learn/x">Start</a><img src="//127.0.0.1:3000/a.png"><a href="http://preview.localhost/">p</a><a href="http://[::1]:8080/">v6</a>';
  assert.equal(findLocalOrigins(html).length, 4);
});
check('fires on entity-ended, css, srcset and escaped-JSON forms', () => {
  assert.deepEqual(findLocalOrigins('href="http://localhost:8080&quot;'), [
    'http://localhost:8080',
  ]);
  assert.deepEqual(findLocalOrigins('background:url(//localhost)'), ['//localhost']);
  assert.deepEqual(findLocalOrigins('srcset="http://localhost:3000/a.png 1x, x.png 2x"'), [
    'http://localhost:3000',
  ]);
  assert.deepEqual(findLocalOrigins('{"u":"http:\\/\\/localhost:8080\\/learn"}'), [
    'http://localhost:8080',
  ]);
  assert.deepEqual(findLocalOrigins('a=http://localhost:8080,b'), ['http://localhost:8080']);
});
check('stays silent on the production site and on prose', () => {
  assert.deepEqual(
    findLocalOrigins(
      '<a href="https://carsi.com.au/login">Sign in</a> localhost is not a link here; localhosted.com.au'
    ),
    []
  );
  assert.deepEqual(findLocalOrigins('https://localhosting.example.com/'), []);
});
check('fires on white text on a white field (GP-624)', () => {
  assert.equal(
    isUnreadable({ color: 'rgb(255, 255, 255)', background: 'rgb(255, 255, 255)' }),
    true
  );
  assert.equal(
    isUnreadable({ color: 'rgb(250, 250, 250)', background: 'rgb(255, 255, 255)' }),
    true
  );
});
check('stays silent on the colours measured live on 12 Oct', () => {
  assert.equal(isUnreadable({ color: 'rgb(55, 65, 81)', background: 'rgb(255, 255, 255)' }), false);
  assert.equal(isUnreadable({ color: 'rgb(31, 41, 55)', background: 'rgb(255, 255, 255)' }), false);
});
check('contrast is symmetric and 21 for black on white', () => {
  assert.equal(Math.round(contrastRatio('rgb(0,0,0)', 'rgb(255,255,255)')), 21);
  assert.equal(
    contrastRatio('rgb(0,0,0)', 'rgb(255,255,255)'),
    contrastRatio('rgb(255,255,255)', 'rgb(0,0,0)')
  );
});
check('a colour the guard cannot read is "unknown", never "readable"', () => {
  // Tailwind v4 computes colours as oklch(). An earlier draft returned "readable" for anything it
  // could not parse, so a white-on-white oklch field would have passed. Unknown fails the audit.
  assert.equal(judgeContrast({ color: 'oklch(1 0 0)', background: 'rgb(255,255,255)' }), 'unknown');
  assert.equal(judgeContrast({ color: 'transparent', background: 'rgb(255,255,255)' }), 'unknown');
  assert.equal(judgeContrast({ color: 'rgb(0,0,0)', background: '' }), 'unknown');
});
check('judgeContrast agrees with the measured fault and the measured clean colours', () => {
  assert.equal(
    judgeContrast({ color: 'rgb(255, 255, 255)', background: 'rgb(255, 255, 255)' }),
    'unreadable'
  );
  assert.equal(
    judgeContrast({ color: 'rgba(55, 65, 81, 1)', background: 'rgb(255, 255, 255)' }),
    'readable'
  );
});
check('a semi-transparent text colour is judged as it lands on its background', () => {
  // Dark text at 5% opacity on white is effectively white; reading it at full opacity misses it.
  assert.equal(
    judgeContrast({ color: 'rgba(0, 0, 0, 0.05)', background: 'rgb(255, 255, 255)' }),
    'unreadable'
  );
});
check('exit codes: fault is 1, unjudged or vacuous is 2, clean and non-vacuous is 0', () => {
  const base = { faults: [], unjudged: [], pagesRead: 9, fieldsRead: 12, redirectsRead: 2 };
  assert.equal(summarise(base).code, 0);
  assert.equal(summarise({ ...base, faults: ['x'] }).code, 1);
  assert.equal(summarise({ ...base, unjudged: ['y'] }).code, 2);
  assert.equal(summarise({ ...base, fieldsRead: 0 }).code, 2);
  assert.equal(summarise({ ...base, pagesRead: 0 }).code, 2);
  assert.equal(summarise({ ...base, redirectsRead: 1 }).code, 2);
  // A real fault outranks an unjudged field: red, not "could not look".
  assert.equal(summarise({ ...base, faults: ['x'], unjudged: ['y'] }).code, 1);
});
check('a marked-unreadable colour stays unknown even when it wraps an rgb() value', () => {
  assert.equal(
    judgeContrast({ color: 'UNREADABLE:rgb(0,0,0)', background: 'rgb(255,255,255)' }),
    'unknown'
  );
  assert.equal(
    judgeContrast({ color: 'rgb(0,0,0)', background: 'UNREADABLE:rgb(255,255,255)' }),
    'unknown'
  );
});
check('private and loopback hosts are recognised; public hosts are not', () => {
  for (const h of [
    'localhost',
    'preview.localhost',
    '127.0.0.1',
    '127.1.2.3',
    '10.0.0.5',
    '192.168.1.1',
    '172.16.0.1',
    '172.31.255.255',
    '169.254.169.254',
    '0.0.0.0',
    '[::1]',
    '::1',
    '[fd00::1]',
  ]) {
    assert.equal(isPrivateHost(h), true, h);
  }
  for (const h of ['carsi.com.au', 'checkout.stripe.com', '172.32.0.1', '11.0.0.1']) {
    assert.equal(isPrivateHost(h), false, h);
  }
});
check('a redirect is followed only within the audited site; never to a private host', () => {
  const site = 'https://carsi.com.au';
  assert.deepEqual(redirectDecision('/login', 'https://carsi.com.au/register', site), {
    follow: true,
    next: 'https://carsi.com.au/login',
  });
  const local = redirectDecision('http://localhost:8080/login', 'https://carsi.com.au/x', site);
  assert.equal(local.follow, false);
  assert.match(local.fault, /localhost:8080/);
  const meta = redirectDecision('http://169.254.169.254/latest', 'https://carsi.com.au/x', site);
  assert.equal(meta.follow, false);
  assert.ok(meta.fault);
  const offsite = redirectDecision('https://example.com/', 'https://carsi.com.au/x', site);
  assert.equal(offsite.follow, false);
  assert.equal(offsite.fault, undefined);
  assert.match(offsite.error, /example\.com/);
  // The local fixture site itself is a loopback origin; same-origin hops there are allowed.
  assert.equal(
    redirectDecision('/login', 'http://127.0.0.1:4799/x', 'http://127.0.0.1:4799').follow,
    true
  );
});
check('IPv4-mapped IPv6 loopback is private, in both spellings the URL parser can produce', () => {
  assert.equal(isPrivateHost(new URL('http://[::ffff:127.0.0.1]:8080/').hostname), true);
  assert.equal(isPrivateHost('[::ffff:7f00:1]'), true);
  assert.equal(isPrivateHost('[::ffff:a00:5]'), true);
  assert.equal(isPrivateHost('[::ffff:808:808]'), false);
});
check(
  'the browser refuses every raw-IP host other than the audited site, whatever the spelling',
  () => {
    // Round 2 of review found one more loopback spelling. Rather than chase spellings, the browser
    // boundary refuses ANY IP-literal host that is not the site; named hosts get the private check.
    for (const url of [
      'http://[::ffff:127.0.0.1]:8080/a.png',
      'http://[::ffff:7f00:1]/',
      'http://[::127.0.0.1]/',
      'http://127.1/',
      'http://2130706433/',
      'http://0x7f.1/',
      'http://93.184.216.34/',
      'http://[2001:db8::1]/',
      'http://localhost:3000/',
      'http://preview.localhost/',
    ]) {
      assert.equal(blockBrowserRequest(url, 'https://carsi.com.au'), true, url);
    }
    for (const url of [
      'https://carsi.com.au/_next/static/a.js',
      'https://js.stripe.com/v3/',
      'https://www.googletagmanager.com/gtm.js',
      'data:image/png;base64,AAAA',
    ]) {
      assert.equal(blockBrowserRequest(url, 'https://carsi.com.au'), false, url);
    }
    // The local fixture site is itself a loopback origin and must stay reachable.
    assert.equal(blockBrowserRequest('http://127.0.0.1:4799/x', 'http://127.0.0.1:4799'), false);
    assert.equal(blockBrowserRequest('http://127.0.0.1:4800/x', 'http://127.0.0.1:4799'), true);
  }
);
check('fires on short, decimal and hex loopback spellings in page text (GP-674)', () => {
  // The text scan used to match dotted 127.x only. The URL parser reads all of these as
  // 127.0.0.1, which is how the guard now judges them.
  assert.deepEqual(findLocalOrigins('<a href="http://127.1:8080/learn">Start</a>'), [
    'http://127.1:8080',
  ]);
  assert.deepEqual(findLocalOrigins('<a href="http://2130706433:8080/">Start</a>'), [
    'http://2130706433:8080',
  ]);
  assert.deepEqual(findLocalOrigins('<img src="//0x7f.1:3000/a.png">'), ['//0x7f.1:3000']);
  assert.deepEqual(findLocalOrigins('{"u":"http:\\/\\/127.1:8080\\/learn"}'), [
    'http://127.1:8080',
  ]);
  assert.deepEqual(findLocalOrigins('href="https://[::ffff:7f00:1]:8080/x"'), [
    'https://[::ffff:7f00:1]:8080',
  ]);
  // Private ranges are judged by the same isPrivateHost the redirect and browser checks use.
  assert.deepEqual(findLocalOrigins('<a href="http://10.0.0.5/admin">x</a>'), ['http://10.0.0.5']);
});
check('the parsed text pass stays silent on public hosts, versions and comments', () => {
  assert.deepEqual(
    findLocalOrigins(
      '<a href="https://carsi.com.au/courses">x</a><script src="https://js.stripe.com/v3/"></script>' +
        '<link href="//fonts.example.com/a.css"> v1.27.0.1 https://8.8.8.8/ // 10 seconds //10 a//127.1'
    ),
    []
  );
});
check('a dotless scheme-relative host is caught when it is an attribute value', () => {
  // CodeRabbit on #1033: `//2130706433` has no dot or port, but as a link it is 127.0.0.1.
  assert.deepEqual(findLocalOrigins('<a href="//2130706433/learn">x</a>'), ['//2130706433']);
  assert.deepEqual(findLocalOrigins("<img src='//2130706433'>"), ['//2130706433']);
  assert.deepEqual(findLocalOrigins('<a href=//2130706433/x>x</a>'), ['//2130706433']);
  // The rendered scan passes bare attribute values joined by spaces: every one is a link.
  assert.deepEqual(findLocalOrigins('/courses //2130706433/x #top', { attributeValues: true }), [
    '//2130706433',
  ]);
  // In prose it stays a comment-shaped string, not a link.
  assert.deepEqual(findLocalOrigins('wait //10 then retry'), []);
  // CodeRabbit on #1033 (round 2): browsers strip spaces around a URL value, so these are links too.
  assert.deepEqual(findLocalOrigins('<a href=" //2130706433/learn">x</a>'), ['//2130706433']);
  assert.deepEqual(findLocalOrigins("<a href = '  //2130706433'>x</a>"), ['//2130706433']);
  assert.deepEqual(findLocalOrigins('<img src=\n\t//2130706433/p.png>'), ['//2130706433']);
});
check('URL-like text in script and CSS comments is not a link (GP-686 item 2)', () => {
  // Negative controls: the Codex review of 5cc27051 found these raised a false LOCALHOST.
  assert.deepEqual(findLocalOrigins('<script> //127.1:8080 means local dev only </script>'), []);
  assert.deepEqual(findLocalOrigins('<style>/* //10.0.0.1:8080 old staging */ a{}</style>'), []);
  assert.deepEqual(findLocalOrigins('<script>\n//localhost:3000 for dev\nrun();</script>'), []);
  assert.deepEqual(findLocalOrigins('<script>go(); //127.0.0.1:9 dev</script>'), []);
  // Positive controls: the same hosts where a browser or parser reads a URL still fire.
  assert.deepEqual(findLocalOrigins("<script>fetch('//127.1:8080/api')</script>"), [
    '//127.1:8080',
  ]);
  assert.deepEqual(findLocalOrigins('<script>const u = "//localhost:3000/x";</script>'), [
    '//localhost:3000',
  ]);
  assert.deepEqual(findLocalOrigins('<style>a{background:url( //10.0.0.1:8080/a.png)}</style>'), [
    '//10.0.0.1:8080',
  ]);
  assert.deepEqual(findLocalOrigins('<style>@import url("//127.1:8080/a.css");</style>'), [
    '//127.1:8080',
  ]);
  assert.deepEqual(findLocalOrigins('<img srcset="a.png 1x, //127.1:8080/b.png 2x">'), [
    '//127.1:8080',
  ]);
  assert.deepEqual(findLocalOrigins('<div data-u="{&quot;u&quot;:&quot;//127.1:8080&quot;}">'), [
    '//127.1:8080',
  ]);
  // A scheme makes it a URL wherever it stands, and a Location header is one URL on its own.
  assert.deepEqual(findLocalOrigins('<script>// see http://127.1:8080 </script>'), [
    'http://127.1:8080',
  ]);
  assert.deepEqual(findLocalOrigins('//127.1:8080/login'), ['//127.1:8080']);
  assert.deepEqual(findLocalOrigins('//localhost/login'), ['//localhost']);
});
check('a comma or quote inside a comment does not make //host a URL (GP-691)', () => {
  // Negative controls: both raised a false LOCALHOST before GP-691.
  assert.deepEqual(findLocalOrigins('<style>/* old, //127.1:8080 dev */</style>'), []);
  assert.deepEqual(findLocalOrigins('<script>// "//127.1:8080" dev</script>'), []);
  assert.deepEqual(
    findLocalOrigins('<script type="module">\n  // \'//localhost:3000/x\' old\n</script>'),
    []
  );
  assert.deepEqual(
    findLocalOrigins('<script>go();\r\n// `//10.0.0.1:8080` staging\r\nrun();</script>'),
    []
  );
  // Positive controls: every later srcset candidate still fires, with or without descriptors.
  for (const html of [
    '<img srcset="a.png, //127.1:8080/b.png 2x">',
    "<img srcset='a.png 1x,//127.1:8080/b.png 2x'>",
    '<img srcset=a.png,//127.1:8080/b.png>',
    '<link rel="preload" imagesrcset="a.png 1x, //127.1:8080/b.png 2x">',
    '{"srcSet":"/a.png 640w, //127.1:8080/b.png 1080w"}',
    '<div data-i="{&quot;srcSet&quot;:&quot;/a.png 1.5x , //127.1:8080/b.png 2x&quot;}">',
  ]) {
    assert.deepEqual(findLocalOrigins(html), ['//127.1:8080'], html);
  }
  // Positive controls: a working string after the comment line, whatever ends that line.
  for (const end of ['\n', '\r', ' ', ' ']) {
    const html = `<script>// note "x"${end}fetch("//127.1:8080/x")</script>`;
    assert.deepEqual(findLocalOrigins(html), ['//127.1:8080'], JSON.stringify(html));
  }
  // Positive controls: a comment after code, a comment outside a script, an attribute.
  assert.deepEqual(findLocalOrigins('<script>go(); // "//127.1:8080"</script>'), ['//127.1:8080']);
  assert.deepEqual(findLocalOrigins('<script>u = "//a" + "//127.1:8080/x"</script>'), [
    '//127.1:8080',
  ]);
  assert.deepEqual(findLocalOrigins('<p>\n// "//127.1:8080"</p>'), ['//127.1:8080']);
  assert.deepEqual(findLocalOrigins('<script\n// src="//127.1:8080/x.js"></script>'), [
    '//127.1:8080',
  ]);
  assert.deepEqual(findLocalOrigins('<script>x</script>\n// "//127.1:8080"'), ['//127.1:8080']);
});
check('a script line is suppressed only when a JS lexer confirms the comment (#1192)', () => {
  // Positive controls: each `//` looks like a whole-line comment but is not one, so the URL
  // after it is live code. Before this fix the first returned [] (a false green).
  for (const html of [
    '<script>/*\n// */ fetch("//localhost:3000/api")\n</script>',
    '<script>/* a\n b\n// */ fetch("//localhost:3000/api")</script>',
    '<script>const t = `\n// ${x}`; fetch("//localhost:3000/api")</script>',
    '<script>const t = `\n// "//localhost:3000/api"`;</script>',
    '<script>const t = `${`\n// "//localhost:3000/api"`}`;</script>',
    '<script>const s = \'a\\\n// "//localhost:3000/api"\';</script>',
    '<script>if (a) /[/*]/.test(b);\n// */ fetch("//localhost:3000/api")</script>',
    '<script>if (a) /\'/.test(b);\n// "//localhost:3000/api"</script>',
    '<script>/* never closed\n// "//localhost:3000/api"</script>',
    // CodeRabbit on #1192: a `/` after an expression end is division, not a regex start.
    '<script>\nlet x = 2; x++ / 2 /*\n// */ fetch("//localhost:3000/api")\n</script>',
    '<script>let x = 2; x-- / 2 /*\n// */ fetch("//localhost:3000/api")</script>',
    '<script>a[0] / 2 /*\n// */ fetch("//localhost:3000/api")</script>',
    '<script>f() / 2 /*\n// */ fetch("//localhost:3000/api")</script>',
    // A keyword used as a property name is an operand, so the `/` after it is division.
    '<script>\nlet obj = { return: 2 }; obj.return / 2 /*\n// */ fetch("//localhost:3000/api")\n</script>',
    '<script>o?.typeof / 2 /*\n// */ fetch("//localhost:3000/api")</script>',
    // `of` / `yield` / `await` may be identifiers, so a `/` after one is not trusted as a regex.
    '<script>\nlet of = 2; of / 2 /*\n// */ fetch("//localhost:3000/api")\n</script>',
    '<script>var yield = 4; yield / 2 /*\n// */ fetch("//localhost:3000/api")</script>',
    '<script>var await = 4; await / 2 /*\n// */ fetch("//localhost:3000/api")</script>',
  ]) {
    assert.deepEqual(findLocalOrigins(html), ['//localhost:3000'], JSON.stringify(html));
  }
  // Negative controls: confirmed line comments stay suppressed after code the lexer can read.
  for (const html of [
    '<script>/* a */\n// "//localhost:3000/api" old</script>',
    '<script>const t = `a ${b ? "x" : `y`} c`;\n// "//localhost:3000/api" old</script>',
    '<script>const r = /"\\//g; const q = "it\'s";\n// "//localhost:3000/api" old</script>',
    '<script>return /a/.test(b) && c / 2;\n// "//localhost:3000/api" old</script>',
    '<script>const d = a / b;\n// "//localhost:3000/api" old</script>',
    '<script>x = /[/*]/;\n// */ "//localhost:3000/api" old</script>',
  ]) {
    assert.deepEqual(findLocalOrigins(html), [], JSON.stringify(html));
  }
});
check('srcset spans come from real HTML attributes, not script text (#1192)', () => {
  // Positive controls: before this fix the script string swallowed the real attribute.
  for (const html of [
    '<script>const note=\'srcset="\';</script><img srcset="a.png, //localhost:3000/b.png 2x">',
    '<style>/* srcset="x */</style><img srcset="a.png, //localhost:3000/b.png 2x">',
    '<!-- srcset=" --><img srcset="a.png, //localhost:3000/b.png 2x">',
    '<img alt=\'srcset="\' srcset="a.png, //localhost:3000/b.png 2x">',
    '<img srcset=a.png,//localhost:3000/b.png>',
    '<link rel="preload" IMAGESRCSET=\'a.png, //localhost:3000/b.png 2x\'>',
  ]) {
    assert.deepEqual(findLocalOrigins(html), ['//localhost:3000'], html);
  }
  // Negative controls: srcset-looking text inside a script or style opens no srcset span.
  assert.deepEqual(
    findLocalOrigins('<script>const n = \'srcset="a, //127.1:8080 b"\';</script>'),
    []
  );
  assert.deepEqual(findLocalOrigins('<style>/* srcset=a.png, //127.1:8080 dev */</style>'), []);
});
check('a serialized srcSet value counts a descriptor-free first candidate (#1192)', () => {
  for (const html of [
    '{"srcSet":"a.png, //localhost:3000/b.png 2x"}',
    '{"imageSrcSet":"a.png,//localhost:3000/b.png"}',
    'self.__next_f.push([1,"{\\"srcSet\\":\\"a.png, //localhost:3000/b.png 2x\\"}"])',
    '<div data-i="{&quot;srcSet&quot;:&quot;a.png, //localhost:3000/b.png 2x&quot;}">',
  ]) {
    assert.deepEqual(findLocalOrigins(html), ['//localhost:3000'], html);
  }
  // Negative controls: a comma outside any srcset value is still not a link.
  assert.deepEqual(findLocalOrigins('<style>/* old, //127.1:8080 dev */</style>'), []);
  assert.deepEqual(
    findLocalOrigins('{"srcSet":"a.png 1x"}<style>/* old, //127.1:8080 dev */</style>'),
    []
  );
});
check('an attribute value is found after any run of padding spaces (GP-686 item 3)', () => {
  // CodeRabbit on #1033 (round 3): the look-back was a fixed 16 characters.
  const pad = ' '.repeat(40);
  assert.deepEqual(findLocalOrigins(`<a href="${pad}//2130706433/learn">x</a>`), ['//2130706433']);
  assert.deepEqual(findLocalOrigins(`<a href=${pad}'${pad}//2130706433'>x</a>`), ['//2130706433']);
  assert.deepEqual(findLocalOrigins(`<img src=${pad}//2130706433/p.png>`), ['//2130706433']);
  // Still silent where the padding is not after `=`.
  assert.deepEqual(findLocalOrigins(`<p>wait${pad}//10 then retry</p>`), []);
});
check('the parsed pass stays linear on a long run of spaces', () => {
  const big = '<a href="' + ' '.repeat(200000) + '//2130706433">x</a>' + ' //1'.repeat(50000);
  const t0 = Date.now();
  assert.deepEqual(findLocalOrigins(big), ['//2130706433']);
  assert.ok(Date.now() - t0 < 2000, `took ${Date.now() - t0} ms`);
});
check('the comma and comment look-ups stay fast on many srcsets and comments (GP-691)', () => {
  const big =
    '<img srcset="a.png 1x, //cdn.example/b.png 2x">'.repeat(20000) +
    `<script>${'\n// "//1"'.repeat(20000)}</script>`;
  const t0 = Date.now();
  assert.deepEqual(findLocalOrigins(big), []);
  assert.ok(Date.now() - t0 < 2000, `took ${Date.now() - t0} ms`);
});
check('the quick-enrol card selector is the data attribute on the card (GP-674)', () => {
  assert.equal(QUICK_ENROL_CARD_ATTR, 'data-quick-enrol-card');
  assert.equal(QUICK_ENROL_CARD_SELECTOR, 'form[data-quick-enrol-card]');
});
check('a fault already found survives a later audit error (red, not "could not look")', () => {
  const e = new Error('later page timed out');
  assert.equal(failureSummary(e, ['LOCALHOST /: http://localhost:8080']).code, 1);
  assert.equal(failureSummary(e, []).code, 2);
});

if (failures) {
  console.error(`✗ ${failures} buy-path guard test(s) failed`);
  process.exit(1);
}
console.log('✓ buy-path guard tests passed');
