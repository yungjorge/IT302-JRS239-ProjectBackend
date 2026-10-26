# IT302 Phase 3 C.U.D. MongoDB

Jorge Sanchez | UCID: jrs239 | IT-302 | Section 451 | jrs239@njit.edu

The identification details above come from the existing Phase 2 source headers.
The original `organizations_jrs239` collection and GET API are preserved.
Comments use the separate `comments_jrs239` collection in the configured database.

## Run locally

From PowerShell in the repository root:

```powershell
cd backend
npm ci
npm start
```

Keep MongoDB running. The existing ignored `backend/.env` configures the local
database. On a new machine, copy `backend/.env.example` to `backend/.env` and
set `MONGODB_URI`, `MONGODB_DATABASE`, `MONGODB_COLLECTION=organizations_jrs239`,
and optionally `PORT=5000`. Do not commit `.env` or put credentials into screenshots.
Startup explicitly creates `comments_jrs239` if it does not yet exist, even before
the first POST. The database account needs collection creation and comment
read/write permissions, plus read access to organizations.

## MVC and data contract

`backend/api/comments.route.js` dispatches to `comments.controller.js` for input
validation and responses. `backend/dao/commentsDAO.js` performs database writes.
`index.js` connects and initializes both DAOs; `server.js` mounts both routers.
The only addition to the organizations DAO is a read-only existence check by `id`.

Use `Content-Type: application/json` for all three comment methods.
`organizationId` is the unique positive numeric `id` from a returned organization
(for example, engineyard has `id: 81`), not its MongoDB `_id` or login.
Each comment receives its own unique MongoDB ObjectId, returned as `comment._id`.
Multiple comments may reference the same organization.

| Method | URL path | JSON body | Success |
| --- | --- | --- | --- |
| POST | `/api/v1/jrs239/comments` | `organizationId`, `text`, `userName`, `userId` | 201 with the new `comment` |
| PUT | `/api/v1/jrs239/comments/:commentId` | `text`, `userId` | 200 with the updated `comment` |
| DELETE | `/api/v1/jrs239/comments/:commentId` | `userId` | 200 with `deletedId` |

POST example:

```json
{
  "organizationId": 81,
  "text": "This organization provides useful resources for learning web development.",
  "userName": "Jorge Sanchez",
  "userId": "jrs239"
}
```

PUT example (replace `:commentId` in the URL with the actual POST response ID):

```json
{
  "text": "This organization publishes helpful examples that support my database coursework.",
  "userId": "jrs239"
}
```

DELETE example:

```json
{ "userId": "jrs239" }
```

Text is trimmed and must have 20-5000 characters, at least three words, and
terminal sentence punctuation (`.`, `!`, or `?`, optionally followed by a closing
quote or parenthesis). This enforces sentence form; the author must supply
meaningful content. `userName` is a trimmed nonempty string up to 100 characters;
`userId` is a trimmed nonempty string up to 128 characters. Extra body fields,
including client-supplied `LastModified`, are rejected. IDs in URLs must be exactly
24 hexadecimal characters.

`LastModified` is stored as a BSON Date and returned as an ISO 8601 UTC string.
POST sets it with the application server's current time. PUT refreshes it with
MongoDB `$currentDate`; identity and organization fields remain unchanged.
DELETE returns the deleted ID; it has no new modification date because the
document no longer exists.

Invalid inputs return 400, unknown organizations and comments return 404,
oversized bodies return 413, and unsupported content types return 415.
Unexpected database errors return a generic JSON 500 without connection details.
PUT and DELETE atomically match both `_id` and `userId`; an owner mismatch also
returns 404 and does not reveal whether another user's comment exists.
The assignment's supplied `userId` is an ownership selector, not authenticated
identity. Anyone who knows the ID and supplied userId can reproduce the request;
a production application would need authentication.

## Real MongoDB verification

In `backend`, run:

```powershell
npm test
```

To save fresh machine-readable evidence as well:

```powershell
$env:PHASE3_REPORT_PATH = 'test-results/phase3-local.json'
npm test
Remove-Item Env:PHASE3_REPORT_PATH
```

The integration suite uses real HTTP on a temporary local port and the configured
MongoDB database, with no mock database. It checks the Phase 2 GET results against
direct reads; creates a comment and checks its persisted fields and BSON Date;
updates it and checks the new text/date; deletes it and checks its absence.
It also checks invalid inputs, owner mismatches, missing records, repeat deletion,
and malformed/oversized/non-JSON requests. It compares all original organization
and comment documents before and after and cleans up only its uniquely identified
test comments. Do not run against a database receiving concurrent writes, because
the preservation check deliberately compares entire collection snapshots.

The checked-in `backend/test-results/phase3-local.json` records an actual local
integration run, including request URLs, statuses, mutation responses, and matching
before/after SHA-256 hashes for the organization collection. It is test evidence,
not a Postman screenshot. Re-running tests without `PHASE3_REPORT_PATH` does not
overwrite this report.

The verified local run passed 14 integration checks (53 HTTP exchanges), kept all
30 organization documents identical, and left zero test comments. The actual
`npm start` entry point was also started successfully on port 5000. The supplied
Postman collection was executed against it with Newman 6.2.3: all seven requests
and 16 assertions passed. The genuine runner output is saved as
`backend/test-results/phase3-postman-run.json`; it is not a screenshot. The runtime
dependency audit reported zero vulnerabilities after updating the body parser.

For additional direct inspection in MongoDB Compass, open the configured database
and `comments_jrs239`. After POST, filter with the returned `_id` and confirm the
organization, text, owner, and `LastModified` Date. After PUT, refresh and confirm
the changed sentence/date. After DELETE, refresh and confirm zero matches.

## Postman and genuine screenshots

Import `postman/Phase3-jrs239.postman_collection.json`. The default `baseUrl` is
`http://localhost:5000`. For a deployed service, set it to the actual HTTPS origin
without a trailing slash. The `/api/v1/jrs239` path remains literal in every URL.
Avoid an active Postman environment that overrides the collection variables.
For this verified deployment, import and select
`postman/Phase3-Render-jrs239.postman_environment.json`; it intentionally overrides
only `baseUrl` with `https://it302-jrs239-phase3.onrender.com`.

Send requests 01-07 in order. Request 01 selects an existing organization; POST
automatically saves `commentId` and its creation date for PUT and DELETE.
The collection includes assertions for successful operations, advancing
`LastModified`, owner rejection, repeat deletion, and invalid text. To start a new
workflow after deleting a comment, run POST again and use the newly returned ID.
For screenshots, send requests individually so POST and PUT remain visible before
the next request replaces their response. Collection Runner results alone do not
show the required request body and response together.

Capture these three real Postman views immediately after sending:

1. `01_post_comment.png`: POST, full URL
   `http://localhost:5000/api/v1/jrs239/comments`, Body > raw > JSON with all four
   fields, status 201, and JSON response showing `_id` and `LastModified`.
2. `02_put_comment.png`: PUT, full URL ending with the actual created ID,
   the updated sentence and `userId` body, status 200, and JSON response showing
   the same `_id`, changed text, and refreshed `LastModified`.
3. `03_delete_comment.png`: DELETE, full URL ending with that same ID,
   the `userId` body, status 200, and JSON response showing `deletedId`.

Expand the request and response panes so the method, complete URL containing
`jrs239`, body, status, and relevant date appear together. Replace URL variable
expressions with their real resolved values if Postman hides the full URL or ID.
Keep the useful response fields visible by adjusting pane sizes and font zoom.
Use deployed HTTPS URLs instead when the assignment requires deployment evidence.
Save captures in a new `IT302_Phase3_Postman_Screenshots` folder. Do not reuse the
Phase 2 images, edit response text, or present test report data as screenshots.
No Phase 3 screenshots have been created as part of this implementation.

## Render deployment and remaining manual work

Deployment is complete and verified on October 26, 2026:

- Service origin: `https://it302-jrs239-phase3.onrender.com`.
- GET: `https://it302-jrs239-phase3.onrender.com/api/v1/jrs239/organizations`.
- Comments: `https://it302-jrs239-phase3.onrender.com/api/v1/jrs239/comments`.
- Render service: `it302-jrs239-phase3`, free Node web service, Virginia.
- Root directory `backend`; build `npm ci`; start `npm start`.
- Health check `/api/v1/jrs239/organizations`; Render supplies `PORT`.
- Atlas cluster `it302-jrs239`, free tier, database `it302`.
- Both `organizations_jrs239` and `comments_jrs239` exist in Atlas.
- Database user role is restricted to `readWrite@it302`.
- The approved Render outbound ranges `74.220.49.0/24` and `74.220.57.0/24`
  are active in the Atlas IP access list; password authentication remains required.

`MONGODB_URI` is stored privately in Render's environment settings.
`MONGODB_DATABASE=it302` and `MONGODB_COLLECTION=organizations_jrs239` are also
configured. The ignored local `backend/.env.atlas` holds the private Atlas URI;
the original ignored `backend/.env` continues to point to local MongoDB.
Neither file is committed. Never include credentials in screenshots or reports.

All 30 local organization records were copied to Atlas with their BSON IDs and
dates preserved. Full sorted-document comparisons and matching SHA-256 hashes
verified the copy, and the local source was unchanged. The Atlas-backed local
integration suite passed all 14 checks. Then 13 HTTPS exchanges exercised the
deployed GET modes, successful C.U.D., rejected owners, invalid inputs, and repeat
deletion. Direct Atlas reads verified insertion, changed text and a later BSON
`LastModified`, and removal. The same supplied Postman collection passed all
seven requests and 16 assertions against the public HTTPS origin with Newman.
All test comments were cleaned up; the original 30 organization records remain
unchanged. The first deployment started before network access was ready and
failed; the subsequent deployment was verified as `Live`.

Evidence in the repository:

- `backend/test-results/phase3-atlas-migration.json`: copied documents and hash.
- `backend/test-results/phase3-atlas-integration.json`: 14 Atlas-backed checks.
- `backend/test-results/phase3-deployed-verification.json`: actual HTTPS requests
  and direct database checks for all three mutations.
- `backend/test-results/phase3-deployed-postman-run.json`: seven real requests,
  16 passing assertions, no failures.
- `deployment-evidence/render-live.jpg`: genuine Render dashboard capture.

The Render capture and Newman reports do not replace the required Postman UI
screenshots. Remaining manual work is to send POST, PUT, and DELETE individually
in Postman against the deployed origin and capture the views described above.
For each screenshot, show the full HTTPS URL containing `jrs239`, method, body,
response status, and JSON response. POST/PUT must include `LastModified`.
Then submit the repository link, `Phase3` tag, service URL, and images according
to the instructor's handout. The free Render instance may take time to wake
after inactivity; allow the request to finish before capturing the result.

Setup references checked against official Render documentation:
[Node/Express deployment](https://render.com/docs/deploy-node-express-app),
[environment variables](https://render.com/docs/configure-environment-variables),
and [port binding](https://render.com/docs/web-services#port-binding).

## Git verification

The implementation commit `3aabdba487debf62fbed0a6eeb3c3c1d8d8368f3` and its
annotated `Phase3` tag were pushed and verified before deployment. That exact
implementation was deployed and tested. Later commits add deployment evidence
and instructions on `main`; the published `Phase3` tag is preserved. Verify:

```powershell
git status --short
git log -1 --oneline
git rev-parse HEAD
git rev-parse 'Phase3^{}'
git ls-remote origin refs/heads/main refs/tags/Phase3 'refs/tags/Phase3^{}'
git diff Phase3 HEAD -- backend/api backend/dao backend/index.js backend/server.js backend/package.json backend/package-lock.json
```

The remote branch SHA must match local `HEAD`; the peeled tag SHA must match the
implementation commit above. The runtime-file comparison must be empty, showing
the deployed implementation is unchanged by the later documentation/evidence
commit. `.env` and `.env.atlas` remain ignored and untracked.
