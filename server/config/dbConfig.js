import mongoose from "mongoose";

const connectDb = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(
      `DB CONNECTION SUCCESSFULLY...${conn.connection.name}`.bgGreen.black,
    );

    // Keep DB indexes identical to the Mongoose schemas: drops stale indexes
    // that are no longer in any schema and creates any missing ones.
    try {
      await mongoose.syncIndexes();
      console.log("DB INDEXES SYNCED WITH MODELS...".bgGreen.black);
    } catch (indexError) {
      console.log(`DB INDEX SYNC FAILED... ${indexError.message}`.bgRed);
    }
  } catch (error) {
    console.log(`DB CONNECTION FAILED... ${error.message}`.bgRed);
  }
};

export default connectDb;
