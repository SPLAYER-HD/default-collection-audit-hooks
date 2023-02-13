const Audit = new Mongo.Collection("audit");
Audit.defaultCollectionHooks();
export default Audit;
