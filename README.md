# Content Studio

A desktop-first photo workspace with a soft lavender sidebar, white canvas, pastel collection cards, and a dense gallery. Built for browsing photographer folders, tagging photos, and curating post collections without rearranging Google Drive.

## Run locally

Requires Node 22 or newer. There are no third-party runtime dependencies.

```sh
cp .env.example .env
npm start
```

Open <http://127.0.0.1:4180>. `npm run dev` restarts the server when its files change. `npm test` runs automated checks; `npm run build` checks syntax and packages the app in `dist/`.

The app starts with a clearly labeled demo library until Google is connected. Demo images are served by Unsplash; optional typography is served by Google Fonts. The original approved prototype is separate from this project.

## Set up real Google Drive

1. Create or choose a project in [Google Cloud Console](https://console.cloud.google.com/).
2. Enable the **Google Drive API**. Configure the Google Auth Platform consent screen with your own app name and contact email. While testing, add your Google account as a test user.
3. Add the read-only Drive scope `https://www.googleapis.com/auth/drive.readonly`, plus `openid` and `email`. This scope allows reading Drive content; it does not permit moving, editing, or deleting files. It is broader than the app's selected-folder browsing filter. Public distribution may require Google's OAuth verification; this beta is intended for your own testing account.
4. Create an OAuth client of type **Web application**. Add this exact authorized redirect URI: `http://127.0.0.1:4180/auth/google/callback`.
5. Put its client ID and client secret in the ignored `.env` file. Set `ALLOWED_GOOGLE_EMAIL` to your Google email to restrict account access. Never commit `.env` or paste secrets into chat, the browser source, or GitHub.
6. Optionally set `DEFAULT_DRIVE_FOLDER_ID` in `.env`. Your initial source folder is already configured in the local ignored environment file; no private folder IDs or photos are committed.
7. Restart the server. Open **Settings → Folder connections → Connect Google Drive** and complete Google's consent screen.
8. Choose **Add folder**, paste a Drive folder link or ID (or select a listed folder), and choose whether to include subfolders. Image files are indexed; videos, documents, and folder shortcuts are skipped. Nested folders and paginated responses are supported, with limits of 500 folders and 10,000 images per source. An incomplete or oversized import fails without saving partial results.

The Google connection used by Codex is separate from this standalone app's OAuth client. Providing a Drive folder link does not authorize the standalone website until its Google sign-in is configured and completed.

## Photo workflow

- Source folders filter the unified gallery. The same Drive file is represented once across overlapping sources. Nested photographer folders also appear as indented sidebar filters. Click a parent source to hide or show its descendants while viewing that source’s photos; expansion is remembered in this browser for each account. Displayed photographer/source credits reflect the folder path.
- Six photos per row on a normal desktop, eight in compact mode, with responsive smaller layouts. Images are lazy loaded and more records are revealed in batches of 48.
- Select photos, add multiple tags, filter by any selected tag, or search filenames, folder credits, and tags.
- Photos may belong to several post collections. Removing a photo from a collection or deleting the collection never deletes a Drive file.
- Settings is pinned to the bottom of the sidebar and has its own routes for connections, collections, and tags. Rename/delete tags globally or edit a single photo's tags from its preview.
- In demo mode downloads are explicitly simulated. In connected mode the download dialog provides a real original-file download link per selected photo; ZIP downloads are not implemented.
- **Refresh** rescans a source for new, updated, or removed photos and preserves its existing tags. Sources also refresh on sign-in/page reload. There is no background or webhook sync yet.
- Removing a real source hides its photos from normal browsing unless another source includes them. Its saved photo metadata, tags and collection membership are retained for re-adding the source. Drive files are untouched.

## Data and security boundaries

Google tokens and refresh tokens remain in server memory, behind an HttpOnly SameSite session cookie. OAuth uses state validation, PKCE, a ten-minute authorization timeout, and session rotation after sign-in. POST endpoints require the configured origin. Downloads and thumbnail proxies require the photo to have been indexed in the current authenticated server session. Source image requests go through the authenticated server rather than leaking tokens into image URLs.

Tags, collection definitions, selected-source metadata and cached photo metadata are saved in browser localStorage, separately for each Google account and for the demo. Photo bytes are streamed, not persisted by the app. This is a single-browser beta: data does not sync across browsers/devices. Browser storage is not a backup; clearing it removes your local organization.

Sessions expire after 24 hours and are lost when the server restarts. Reconnect Google after a restart. A failed source refresh shows an error and may leave its last cached metadata visible; retry Refresh before attempting a download. Access tokens are refreshed server-side while the session is active. Disconnect removes this app session, not the Google-account-wide grant; revoke the grant from Google Account settings if required.

## GitHub now, Vercel later

GitHub stores and checks this source repository. The GitHub Actions workflow runs the tests and build on pushes and pull requests. No GitHub Pages or Vercel deployment is configured: GitHub Pages cannot run this OAuth server.

Before Vercel deployment, adapt the Node request handler to the selected Vercel runtime and move sessions to a durable server-side store; serverless instances cannot share this in-memory session map. Decide on durable, account-owned storage for tags/collections, add recovery/export, validate Google sign-in against the deployed HTTPS domain, and test consent, revocation, permissions and real downloads with the owner's Google account. Configure production credentials as hosting secrets and add the deployed callback URI in Google Cloud. Do not treat the local beta as a ready-to-deploy multi-user service.

## Implementation references

- [Google OAuth web server flow](https://developers.google.com/identity/protocols/oauth2/web-server)
- [Drive search and folder queries](https://developers.google.com/workspace/drive/api/guides/search-files)
- [Authenticated thumbnail metadata](https://developers.google.com/workspace/drive/api/reference/rest/v3/files)
- [Original-file downloads](https://developers.google.com/workspace/drive/api/guides/manage-downloads)
