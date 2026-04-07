import os
import torch
from transformers import GPT2LMHeadModel, GPT2Tokenizer

MODEL_DIR = os.path.join(os.path.dirname(__file__), "../../data/paperlens_model")

_model = None
_tokenizer = None

def load_model():
    global _model, _tokenizer
    if _model is None:
        print("Loading PaperLens model...")
        _tokenizer = GPT2Tokenizer.from_pretrained(MODEL_DIR)
        _model = GPT2LMHeadModel.from_pretrained(MODEL_DIR)
        if torch.cuda.is_available():
            _model = _model.cuda()
        _model.eval()
        print("Model loaded.")
    return _model, _tokenizer

def predict_next(text: str, max_new_tokens: int = 40) -> str:
    model, tokenizer = load_model()

    # Take last 200 chars as context
    prompt = text.strip()[-200:]

    inputs = tokenizer.encode(prompt, return_tensors="pt")
    if torch.cuda.is_available():
        inputs = inputs.cuda()

    with torch.no_grad():
        outputs = model.generate(
            inputs,
            max_new_tokens=max_new_tokens,
            do_sample=True,
            temperature=0.8,
            top_p=0.92,
            top_k=50,
            repetition_penalty=1.3,
            pad_token_id=tokenizer.eos_token_id,
        )

    # Return only the newly generated tokens
    generated = tokenizer.decode(
        outputs[0][inputs.shape[1]:],
        skip_special_tokens=True
    ).strip()

    # Clean up — return first complete sentence
    sentences = generated.split('.')
    if len(sentences) > 1:
        return sentences[0].strip() + '.'
    return generated