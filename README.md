#Movie availability search

https://movies.rajalahti.me

##Main Functionalities

This is a basic react app with a backend build with AWS Lambda. It uses the JustWatch GraphQL-API to search for movies from multiple streaming services and all locations found in JustWatch and NordVPN at once. 

This makes finding a title and watching it with a VPN service easy.

##Backend

- Uses AWS Llambda with nodeJS and deployment with serverless framework
- Sets up two api routes, one for searching for movies with a title and one for getting similar recommendations with OpenAI's GPT4o-API

##Frontend

- Simple React app setup with Create-react-app
