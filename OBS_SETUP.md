# 🎰 Ludoreaction — Setup OBS Studio

## Prerequisiti
- OBS Studio (versione 28+)
- App deployata su GitHub Pages **oppure** in locale con `npm run dev`

---

## 📌 URL da usare

| Modalità | URL (GitHub Pages) | URL (Locale) |
|----------|-------------------|--------------|
| **App standard** | `https://rombri02.github.io/Ludoreaction/` | `http://localhost:5173/Ludoreaction/` |
| **Pannello Dock** | `https://rombri02.github.io/Ludoreaction/?mode=dock` | `http://localhost:5173/Ludoreaction/?mode=dock` |
| **Overlay Stream** | `https://rombri02.github.io/Ludoreaction/?mode=overlay` | `http://localhost:5173/Ludoreaction/?mode=overlay` |

---

## 1️⃣ Pannello di Controllo (Custom Browser Dock)

Questo ti permette di **gestire le scommesse direttamente dentro OBS**, senza cambiare finestra.

1. Apri OBS Studio
2. Vai su **Dock** → **Custom Browser Docks...**
3. Inserisci:
   - **Nome Dock:** `Ludoreaction`
   - **URL:** `https://rombri02.github.io/Ludoreaction/?mode=dock`
4. Clicca **Applica**
5. Un nuovo pannello apparirà — trascinalo dove preferisci nell'interfaccia di OBS

> 💡 Il dock è ottimizzato per larghezze strette (250-400px). Puoi ridimensionarlo come qualsiasi altro pannello OBS.

---

## 2️⃣ Overlay sullo Stream (Browser Source)

Questo mostra le **scommesse attive in diretta sullo stream** con sfondo trasparente e animazioni.

1. Nella tua Scena OBS, clicca **+** su Sorgenti → **Browser**
2. Dai un nome (es: "Ludoreaction Overlay")
3. Inserisci:
   - **URL:** `https://rombri02.github.io/Ludoreaction/?mode=overlay`
   - **Larghezza:** `800`
   - **Altezza:** `400`
4. ✅ Spunta **"Refresh browser when scene becomes active"**
5. Clicca **OK**
6. Posiziona e ridimensiona l'overlay nella scena dove preferisci

> 💡 L'overlay ha sfondo **trasparente** — si integra perfettamente col tuo stream.

---

## 🔄 Sincronizzazione

- Dock e Overlay condividono i dati tramite `localStorage`
- Devono stare nella **stessa istanza OBS** per sincronizzarsi
- Le modifiche fatte nel Dock compaiono nell'Overlay in tempo reale (~250ms)
- L'overlay mostra solo le scommesse **non ancora pagate**

---

## ⚙️ Note Tecniche

- **Tema:** Il Dock forza sempre il tema scuro per coerenza con OBS
- **Overlay trasparente:** Nel CSS dell'overlay il background è `transparent`, compatibile con il rendering di OBS
- **Nessun plugin necessario:** Funziona tutto con le funzionalità native di OBS (Custom Docks + Browser Source)
