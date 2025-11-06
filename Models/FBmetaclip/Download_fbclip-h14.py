# Use a pipeline as a high-level helper
from transformers import pipeline

pipe = pipeline("zero-shot-image-classification", model="facebook/metaclip-h14-fullcc2.5b")
pipe(
    "https://huggingface.co/datasets/huggingface/documentation-images/resolve/main/hub/parrots.png",
    candidate_labels=["animals", "humans", "landscape"],
)


# Use a pipeline as a high-level helper
from transformers import pipeline

pipe = pipeline("image-feature-extraction", model="facebook/dinov2-giant")


# Use a pipeline as a high-level helper
from transformers import pipeline

pipe = pipeline("image-feature-extraction", model="facebook/dinov2-small")


# Use a pipeline as a high-level helper
from transformers import pipeline

pipe = pipeline("automatic-speech-recognition", model="facebook/wav2vec2-large-960h")


# Use a pipeline as a high-level helper
from transformers import pipeline

pipe = pipeline("text-to-audio", model="facebook/musicgen-stereo-large")


# Use a pipeline as a high-level helper
from transformers import pipeline

pipe = pipeline("text-to-audio", model="facebook/musicgen-stereo-small")


# Use a pipeline as a high-level helper
from transformers import pipeline

pipe = pipeline("text-generation", model="facebook/MobileLLM-R1-950M")
messages = [
    {"role": "user", "content": "Who are you?"},
]
pipe(messages)


# Use a pipeline as a high-level helper
from transformers import pipeline

pipe = pipeline("text-generation", model="facebook/MobileLLM-R1-140M")
messages = [
    {"role": "user", "content": "Who are you?"},
]
pipe(messages)



# Use a pipeline as a high-level helper
from transformers import pipeline

pipe = pipeline("text-generation", model="facebook/MobileLLM-R1-950M")
messages = [
    {"role": "user", "content": "Who are you?"},
]
pipe(messages)



# Use a pipeline as a high-level helper
from transformers import pipeline

pipe = pipeline("feature-extraction", model="nvidia/omnivinci", trust_remote_code=True)



hf auth login




Qwen/Qwen3-VL-2B-Instruct-GGUF



from transformers import pipeline

pipe = pipeline("image-text-to-text", model="Qwen/Qwen3-VL-2B-Instruct-GGUF")
messages = [
    {
        "role": "user",
        "content": [
            {"type": "image", "url": "https://huggingface.co/datasets/huggingface/documentation-images/resolve/main/p-blog/candy.JPG"},
            {"type": "text", "text": "What animal is on the candy?"}
        ]
    },
]
pipe(text=messages)


# Use a pipeline as a high-level helper
from transformers import pipeline

pipe = pipeline("image-text-to-text", model="deepseek-ai/DeepSeek-OCR", trust_remote_code=True)
messages = [
    {
        "role": "user",
        "content": [
            {"type": "image", "url": "https://huggingface.co/datasets/huggingface/documentation-images/resolve/main/p-blog/candy.JPG"},
            {"type": "text", "text": "What animal is on the candy?"}
        ]
    },
]



pipe(text=messages)      Copy # Load model directly
from transformers import AutoModel
model = AutoModel.from_pretrained("deepseek-ai/DeepSeek-OCR", trust_remote_code=True, torch_dtype="auto") 
    