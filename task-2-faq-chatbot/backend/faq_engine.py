import math
import re
from typing import Dict, List


FAQS = [
    {
        "id": 1,
        "question": "How do I track my order?",
        "answer": "Open your account, go to Orders, and select Track shipment. You will see the latest carrier updates and estimated delivery date.",
    },
    {
        "id": 2,
        "question": "What is your return policy?",
        "answer": "Most items can be returned within 30 days of delivery if they are unused and in their original packaging. Final sale items are not eligible for return.",
    },
    {
        "id": 3,
        "question": "How long does shipping take?",
        "answer": "Standard shipping usually takes 3 to 7 business days. Express shipping usually takes 1 to 3 business days after order processing.",
    },
    {
        "id": 4,
        "question": "Can I change or cancel my order?",
        "answer": "You can change or cancel an order while it is still processing. Once it ships, you can start a return after delivery.",
    },
    {
        "id": 5,
        "question": "What payment methods do you accept?",
        "answer": "We accept major credit cards, debit cards, UPI, net banking, wallets, and gift cards where available.",
    },
    {
        "id": 6,
        "question": "How do I reset my password?",
        "answer": "Select Forgot password on the sign-in page, enter your registered email address, and follow the secure reset link we send you.",
    },
    {
        "id": 7,
        "question": "Do you ship internationally?",
        "answer": "International shipping is available for selected countries. Shipping costs, taxes, and delivery timelines are shown during checkout.",
    },
    {
        "id": 8,
        "question": "Where can I find my invoice?",
        "answer": "Invoices are available from your account under Orders. Choose the order and select Download invoice.",
    },
    {
        "id": 9,
        "question": "How do I contact customer support?",
        "answer": "You can contact support from the Help section in your account. Support is available by chat and email on business days.",
    },
    {
        "id": 10,
        "question": "When will I receive my refund?",
        "answer": "Refunds are usually processed within 5 to 10 business days after the returned item passes inspection.",
    },
    {
        "id": 11,
        "question": "Can I update my delivery address?",
        "answer": "You can update the delivery address before the order is packed. Go to Orders, select the order, and choose Edit address if available.",
    },
    {
        "id": 12,
        "question": "Are my payments secure?",
        "answer": "Payments are processed through encrypted payment gateways. We do not store full card numbers on our systems.",
    },
]

STOP_WORDS = {
    "a",
    "an",
    "and",
    "are",
    "as",
    "at",
    "be",
    "by",
    "can",
    "do",
    "for",
    "from",
    "how",
    "i",
    "in",
    "is",
    "it",
    "my",
    "of",
    "on",
    "or",
    "our",
    "the",
    "to",
    "what",
    "when",
    "where",
    "with",
    "you",
    "your",
}

SIMILARITY_THRESHOLD = 0.16


def tokenize(text: str) -> List[str]:
    terms = re.sub(r"[^a-z0-9\s]", " ", text.lower()).split()
    return [term for term in terms if len(term) > 1 and term not in STOP_WORDS]


def term_frequency(tokens: List[str]) -> Dict[str, float]:
    total = len(tokens) or 1
    counts: Dict[str, int] = {}
    for token in tokens:
        counts[token] = counts.get(token, 0) + 1
    return {term: count / total for term, count in counts.items()}


def tfidf_vector(tokens: List[str], idf: Dict[str, float]) -> Dict[str, float]:
    tf = term_frequency(tokens)
    return {term: tf[term] * idf[term] for term in tf if term in idf}


def cosine_similarity(left: Dict[str, float], right: Dict[str, float]) -> float:
    dot = sum(weight * right.get(term, 0) for term, weight in left.items())
    left_magnitude = math.sqrt(sum(weight * weight for weight in left.values()))
    right_magnitude = math.sqrt(sum(weight * weight for weight in right.values()))

    if not left_magnitude or not right_magnitude:
        return 0
    return dot / (left_magnitude * right_magnitude)


def build_model():
    documents = [
        tokenize(f"{faq['question']} {faq['question']} {faq['answer']}")
        for faq in FAQS
    ]
    document_frequency: Dict[str, int] = {}

    for tokens in documents:
        for token in set(tokens):
            document_frequency[token] = document_frequency.get(token, 0) + 1

    document_count = len(documents)
    idf = {
        term: math.log((document_count + 1) / (count + 1)) + 1
        for term, count in document_frequency.items()
    }
    vectors = [tfidf_vector(tokens, idf) for tokens in documents]
    return idf, vectors


IDF, FAQ_VECTORS = build_model()


def get_matches(message: str, limit: int = 3):
    query_vector = tfidf_vector(tokenize(message), IDF)
    matches = sorted(
        [
            {
                "faq": faq,
                "score": cosine_similarity(query_vector, vector),
            }
            for faq, vector in zip(FAQS, FAQ_VECTORS)
        ],
        key=lambda item: item["score"],
        reverse=True,
    )
    return matches[:limit]


def answer_question(message: str):
    matches = get_matches(message)
    best = matches[0]
    suggestions = [
        {"question": item["faq"]["question"], "score": round(item["score"], 3)}
        for item in matches
    ]

    if best["score"] < SIMILARITY_THRESHOLD:
        return {
            "answer": "I could not find a confident FAQ match. Try asking about orders, shipping, returns, refunds, payments, invoices, or account access.",
            "matched_question": None,
            "confidence": round(best["score"], 3),
            "suggestions": suggestions,
        }

    return {
        "answer": best["faq"]["answer"],
        "matched_question": best["faq"]["question"],
        "confidence": round(best["score"], 3),
        "suggestions": suggestions,
    }
