import mongoose from "mongoose";

export const connectDb = async () => {

     try {
        await mongoose.connect(process.env.MONGO_URL,
            {
                 dbName: "astro"
            });
            console.log("MongoDB connected");
    } catch(err) {
        console.log("error is " + err );
    }
 
}

