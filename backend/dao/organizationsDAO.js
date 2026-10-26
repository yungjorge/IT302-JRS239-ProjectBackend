/**
 * Jorge Sanchez | UCID: jrs239 | IT-302 | Section: 451
 * Email: jrs239@njit.edu
 * Assignment: Phases 2 and 3 MongoDB
 */
let organizationsCollection;

export default class OrganizationsDAO {
  static async organizationExists(organizationId) {
    if (!organizationsCollection) throw new Error("Organizations DAO has not been initialized");
    return Boolean(await organizationsCollection.findOne({ id: organizationId }, { projection: { _id: 1 } }));
  }

  static async injectDB(client, databaseName, collectionName) {
    const database = client.db(databaseName);
    const existing = await database.listCollections({ name: collectionName }, { nameOnly: true }).toArray();
    if (existing.length === 0) throw new Error("Configured collection does not exist");
    organizationsCollection = database.collection(collectionName);
  }

  static async getOrganizations({ filters = {}, itemsPerPage = 20, pageNumber = 0 } = {}) {
    if (!organizationsCollection) throw new Error("Organizations DAO has not been initialized");
    // Escape regex syntax so the filter is a literal, case-insensitive name search.
    const query = filters.login
      ? { login: { $regex: filters.login.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } }
      : {};
    const [organizations, totalResults] = await Promise.all([
      organizationsCollection.find(query).sort({ id: 1, _id: 1 }).skip(itemsPerPage * pageNumber).limit(itemsPerPage).toArray(),
      organizationsCollection.countDocuments(query),
    ]);
    return { organizations, totalResults };
  }
}
