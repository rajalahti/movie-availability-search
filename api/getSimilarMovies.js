const { ChatOpenAI } = require("@langchain/openai");
const { StructuredOutputParser } = require("langchain/output_parsers");
const { PromptTemplate, ChatPromptTemplate } = require("@langchain/core/prompts");
const { RunnableSequence } = require("@langchain/core/runnables");
const { z } = require("zod");
require("dotenv").config();

const parser = StructuredOutputParser.fromZodSchema(
  z.array(
    z.object({
      title: z.string().describe("Movie title"),
      year: z.string().describe("Year of release"),
      description: z.string().describe("Short description of the movie"),
    })
  )
);

const systemPrompt = new PromptTemplate({
  inputVariables: ["title"],
  template:
    "You are an AI that provides recommendations for similar movies. The user will provide a movie title and you will respond with a list similar movies including the title, year of release, and a short description.",
});

const similarMoviesPrompt = new PromptTemplate({
  inputVariables: ["title", "format_instructions"],
  template: `User: Give me 10 movies similar to "{title}".

  {format_instructions}
  `,
});

exports.getSimilarMovies = async (event) => {
  const model = new ChatOpenAI({
    temperature: 0.5,
    modelName: process.env.MODEL_GPT4O_MINI,
    maxTokens: 4000,
    openaiApiKey: process.env.OPENAI_API_KEY,
  });

  const title = event.queryStringParameters.title;

  const chatPrompt = ChatPromptTemplate.fromMessages([
    ["system", systemPrompt.template],
    ["human", similarMoviesPrompt.template],
  ]);

  const chain = RunnableSequence.from([chatPrompt, model, parser]);

  let similarMovies = [];
  try {
    const response = await chain.invoke({
      title: title,
      format_instructions: parser.getFormatInstructions(),
    });
    similarMovies = response;
  } catch (error) {
    console.error("Error parsing:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Error fetching similar movies" }),
    };
  }

  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  return {
    statusCode: 200,
    headers: headers,
    body: JSON.stringify(similarMovies),
  };
};