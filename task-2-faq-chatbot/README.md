# FAQ Chatbot 

React/Next.js frontend with a Python FastAPI backend. The backend uses a predefined FAQ dataset, basic NLP preprocessing, TF-IDF vectors, and cosine similarity to return the closest answer.

## Project Structure


faq-chatbot-fullstack/
  backend/
    faq_engine.py
    main.py
    requirements.txt
  frontend/
    src/app/
    package.json


## How Matching Works

1. FAQ question and answer text is lowercased and tokenized.
2. Common stop words are removed.
3. Each FAQ document is converted into a TF-IDF vector.
4. The user message is converted into the same vector space.
5. Cosine similarity ranks the FAQs.
6. The API returns the best answer, confidence score, and closest suggestions.
