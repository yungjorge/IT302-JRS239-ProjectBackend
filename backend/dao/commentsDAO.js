/**
 * Jorge Sanchez | UCID: jrs239 | IT-302 | Section: 451
 * Email: jrs239@njit.edu
 * Assignment: Phase 3 C.U.D. MongoDB
 */
import { ObjectId } from "mongodb";

let commentsCollection;

export default class CommentsDAO {
  static async injectDB(client, databaseName) {
    const database = client.db(databaseName);
    const collectionName = "comments_jrs239";
    const existing = await database.listCollections({ name: collectionName }, { nameOnly: true }).toArray();
    if (existing.length === 0) {
      try {
        await database.createCollection(collectionName);
      } catch (error) {
        // Another instance may have initialized the collection concurrently.
        if (error.code !== 48) throw error;
      }
    }
    commentsCollection = database.collection(collectionName);
  }

  static collection() {
    if (!commentsCollection) throw new Error("Comments DAO has not been initialized");
    return commentsCollection;
  }

  static async addComment({ organizationId, text, userName, userId }) {
    const comment = { organizationId, text, userName, userId, LastModified: new Date() };
    const result = await CommentsDAO.collection().insertOne(comment);
    return { ...comment, _id: result.insertedId };
  }

  static async updateComment(commentId, userId, text) {
    return CommentsDAO.collection().findOneAndUpdate(
      { _id: new ObjectId(commentId), userId },
      { $set: { text }, $currentDate: { LastModified: true } },
      { returnDocument: "after", includeResultMetadata: false },
    );
  }

  static async deleteComment(commentId, userId) {
    return CommentsDAO.collection().deleteOne({ _id: new ObjectId(commentId), userId });
  }
}
