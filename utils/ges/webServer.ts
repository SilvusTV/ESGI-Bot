import { createServer, type IncomingMessage, type ServerResponse } from 'http';
import { authenticatedGuildCount, findLoginService } from './MyGesService';
import Logger from '../Logger';

const MAX_BODY_SIZE = 16 * 1024;
let started = false;

function page(title: string, content: string): string {
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${title}</title><style>body{font-family:system-ui;background:#16131d;color:#f5f1fa;display:grid;place-items:center;min-height:100vh;margin:0}.card{background:#241e2e;padding:2rem;border-radius:14px;width:min(90%,380px)}label{display:block;margin-top:1rem}input,button{box-sizing:border-box;width:100%;padding:.75rem;margin-top:.35rem;border-radius:8px;border:1px solid #735b8b}button{margin-top:1.5rem;background:#735b8b;color:white;font-weight:700;cursor:pointer}.error{color:#ff9c9c}</style></head><body><main class="card"><h1>${title}</h1>${content}</main></body></html>`;
}

function send(res: ServerResponse, status: number, html: string): void {
  res.writeHead(status, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', 'referrer-policy': 'no-referrer', 'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'" });
  res.end(html);
}

async function readForm(req: IncomingMessage): Promise<URLSearchParams> {
  let body = '';
  for await (const chunk of req) { body += chunk; if (body.length > MAX_BODY_SIZE) throw new Error('FORM_TOO_LARGE'); }
  return new URLSearchParams(body);
}

export function publicLoginUrl(sessionId: string): string {
  const base = process.env.WEB_PUBLIC_URL || `http://localhost:${process.env.WEB_PORT || '3000'}`;
  return `${base.replace(/\/$/, '')}/ges/login/${encodeURIComponent(sessionId)}`;
}

export function startWebServer(): void {
  if (started) return;
  started = true;
  const port = Number(process.env.WEB_PORT || 3000);
  const host = process.env.WEB_HOST || '127.0.0.1';
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
      if (req.method === 'GET' && url.pathname === '/health') { res.writeHead(200, { 'content-type': 'application/json' }); return res.end(JSON.stringify({ ok: true, myGesAuthenticatedGuilds: authenticatedGuildCount() })); }
      const match = /^\/ges\/login\/([0-9a-f-]+)$/.exec(url.pathname);
      if (!match) return send(res, 404, page('Page introuvable', '<p>Ce lien n’existe pas.</p>'));
      const myGesService = findLoginService(match[1]);
      const session = myGesService?.getLoginSession(match[1]);
      if (!session || !myGesService) return send(res, 410, page('Lien expiré', '<p>Demande un nouveau lien de connexion sur Discord.</p>'));
      if (req.method === 'GET') return send(res, 200, page('Connexion MyGES', `<p>Les identifiants sont transmis directement à MyGES et ne sont pas enregistrés.</p><form method="post" autocomplete="on"><label>Identifiant<input name="username" autocomplete="username" required></label><label>Mot de passe<input type="password" name="password" autocomplete="current-password" required></label><button type="submit">Se connecter</button></form>`));
      if (req.method !== 'POST') return send(res, 405, page('Méthode refusée', '<p>Requête non autorisée.</p>'));
      const form = await readForm(req); const username = form.get('username')?.trim(); const password = form.get('password');
      if (!username || !password) return send(res, 400, page('Connexion MyGES', '<p class="error">Identifiant et mot de passe obligatoires.</p>'));
      try {
        await myGesService.authenticate(username, password);
        myGesService.consumeLoginSession(match[1]);
        await myGesService.notifySuccess(session.discordUserId);
        return send(res, 200, page('Connexion réussie', '<p>Le bot est maintenant connecté à MyGES. Tu peux fermer cette page.</p>'));
      } catch (error) {
        myGesService.registerLoginFailure(match[1]);
        Logger.warn(`Échec de connexion MyGES: ${(error as Error).message}`);
        return send(res, 401, page('Connexion refusée', '<p class="error">Connexion impossible. Vérifie tes identifiants ou demande un nouveau lien après cinq essais.</p><p><a href="">Réessayer</a></p>'));
      }
    } catch (error) { Logger.error(`Serveur web: ${String(error)}`); return send(res, 500, page('Erreur', '<p>Une erreur interne est survenue.</p>')); }
  });
  server.on('error', (error) => { started = false; Logger.error(`Impossible de démarrer le serveur web: ${error.message}`); });
  server.listen(port, host, () => Logger.info(`Serveur web actif sur ${host}:${port}`));
}
