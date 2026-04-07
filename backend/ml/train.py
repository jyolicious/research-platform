import os
import torch
from transformers import (
    GPT2LMHeadModel,
    GPT2Tokenizer,
    DataCollatorForLanguageModeling,
    Trainer,
    TrainingArguments,
)
from torch.utils.data import Dataset

BASE_MODEL = "distilgpt2"
TRAIN_FILE = os.path.join(os.path.dirname(__file__), "../../data/training_text.txt")
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "../../data/paperlens_model")
BLOCK_SIZE = 128
EPOCHS = 3
BATCH_SIZE = 4   # safer for your GPU
SAVE_STEPS = 500
LOGGING_STEPS = 100

print(f"GPU available: {torch.cuda.is_available()}")
if torch.cuda.is_available():
    print(f"GPU: {torch.cuda.get_device_name(0)}")
    print(f"VRAM: {torch.cuda.get_device_properties(0).total_memory / 1e9:.1f} GB")


class AcademicTextDataset(Dataset):
    def __init__(self, tokenizer, file_path, block_size):
        print(f"Reading {file_path}...")

        with open(file_path, encoding="utf-8") as f:
            lines = f.readlines()

        print("Tokenizing...")

        tokenized = []
        for line in lines:
            tokens = tokenizer(
                line,
                return_attention_mask=False,
                truncation=True,
                max_length=block_size,
            )["input_ids"]
            tokenized.extend(tokens)

        # Split into fixed-size blocks
        self.examples = [
            tokenized[i: i + block_size]
            for i in range(0, len(tokenized) - block_size + 1, block_size)
        ]

        print(f"Dataset: {len(self.examples)} blocks of {block_size} tokens")

    def __len__(self):
        return len(self.examples)

    def __getitem__(self, idx):
        input_ids = torch.tensor(self.examples[idx], dtype=torch.long)
        return {
            "input_ids": input_ids,
            "labels": input_ids.clone(),  # important for GPT training
        }


print("Loading tokenizer...")
tokenizer = GPT2Tokenizer.from_pretrained(BASE_MODEL)
tokenizer.pad_token = tokenizer.eos_token

print("Loading base model...")
model = GPT2LMHeadModel.from_pretrained(BASE_MODEL)

# optional (Trainer already handles this, but safe)
device = "cuda" if torch.cuda.is_available() else "cpu"
model.to(device)

dataset = AcademicTextDataset(tokenizer, TRAIN_FILE, BLOCK_SIZE)

data_collator = DataCollatorForLanguageModeling(
    tokenizer=tokenizer,
    mlm=False,
)

training_args = TrainingArguments(
    output_dir=OUTPUT_DIR,
    num_train_epochs=EPOCHS,
    per_device_train_batch_size=BATCH_SIZE,
    save_steps=SAVE_STEPS,
    logging_steps=LOGGING_STEPS,
    fp16=torch.cuda.is_available(),
    report_to=[],  # important fix
    gradient_accumulation_steps=2,
)

trainer = Trainer(
    model=model,
    args=training_args,
    data_collator=data_collator,
    train_dataset=dataset,
)

print("Starting training...")
trainer.train()

print("Saving model...")
trainer.save_model(OUTPUT_DIR)
tokenizer.save_pretrained(OUTPUT_DIR)
print(f"✅ Model saved to {OUTPUT_DIR}")

# Quick test
print("\nTesting trained model...")
from transformers import pipeline

generator = pipeline("text-generation", model=OUTPUT_DIR, tokenizer=OUTPUT_DIR)

result = generator(
    "The proposed algorithm achieves",
    max_new_tokens=30,
    num_return_sequences=1,
)

print(f"Output: {result[0]['generated_text']}")