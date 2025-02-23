import OpenAI from "openai";
import dotenv from "dotenv";
import JobApplication from "../infrastructure/schemas/jobApplication";
import { Types } from "mongoose";

dotenv.config();

interface Job {
    title: string;
}

interface JobApplicationSchema {
    userId: string;
    fullName: string;
    answers: string[];
    job: Job | Types.ObjectId;
    rating?: string | null;
}

const apiKey = process.env.OPEN_API_KEY;

if (!apiKey) {
    throw new Error("The OPEN_API_KEY is missing or empty!");
}

const client = new OpenAI({ apiKey });

export async function generateRating(jobApplicationId: Types.ObjectId) {
    const jobApplication = await JobApplication.findById(jobApplicationId).populate("job");

    if (!jobApplication) {
        throw new Error("Job application not found!");
    }

    const job = jobApplication.job as unknown as Job;
    const answers = jobApplication.answers;

    if (!job || !job.title || !answers) {
        throw new Error("Invalid job application!");
    }

    const content = `Role: ${job.title}, User Description: ${answers.join(". ")}`;

    const completion = await client.chat.completions.create({
        messages: [{ role: "user", content }],
        model: "ft:gpt-3.5-turbo-0125:stemlink:fullstacktutorial:9oxtnnXK",
    });

    const strResponse = completion.choices[0].message.content;
    console.log(strResponse);

    if (strResponse === null) {
        throw new Error("Response is null!");
    }

    const response = JSON.parse(strResponse);
    if (!response.rate) {
        return;
    }

    await JobApplication.findOneAndUpdate({ _id: jobApplicationId }, { rating: response.rate });
}