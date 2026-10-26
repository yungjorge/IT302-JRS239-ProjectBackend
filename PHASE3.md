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

Deployment was not performed: the available browser reached Render's sign-in
page, and no Render API key was present. No deployed URL or deployed test result
is claimed. The following setup is prepared for an authenticated session:

1. Make the organization dataset available in a MongoDB instance reachable from
   Render. The current local `localhost:27017` server is not reachable from a
   hosted web service. Keep the collection name `organizations_jrs239` and verify
   the imported records before testing. Use a restricted database user and allow
   the service's necessary network access.
2. Create a Render Web Service connected to this GitHub repository and branch
   `main`. Select Node, root directory `backend`, build command `npm ci`, and
   start command `npm start`. Choose the appropriate available compute plan.
3. In the service's Environment settings, securely set `MONGODB_URI` to that
   reachable database's private connection string, `MONGODB_DATABASE` to its
   database name, and `MONGODB_COLLECTION` to `organizations_jrs239`.
   Do not upload or commit the local `.env`. Let Render supply `PORT`; the server
   reads it and binds to `0.0.0.0`. `comments_jrs239` initializes on startup.
4. Deploy and wait for a successful live deployment. Use the service's actual
   HTTPS URL as Postman's `baseUrl`. Run all collection requests, verify stored
   changes in that same hosted database, and confirm the original GET requests
   still work. A 200 GET alone does not verify C.U.D.
5. Capture the genuine screenshots described above, using the deployed URL if
   required. Submit the repository link, `Phase3` tag, real service URL, and images
   according to the instructor's handout.

Setup references checked against official Render documentation:
[Node/Express deployment](https://render.com/docs/deploy-node-express-app),
[environment variables](https://render.com/docs/configure-environment-variables),
and [port binding](https://render.com/docs/web-services#port-binding).

## Git verification

The requested final sequence is commit, push `main`, create annotated `Phase3`,
and push the tag after tests pass. Verify the remote independently:

```powershell
git status --short
git log -1 --oneline
git rev-parse HEAD
git rev-parse 'Phase3^{}'
git ls-remote origin refs/heads/main refs/tags/Phase3 'refs/tags/Phase3^{}'
```

The branch SHA and peeled tag SHA must both equal the tested commit. A local tag
alone does not establish that it was pushed. Do not replace an existing Phase3
tag without investigating its target. `.env` remains ignored and untracked.
