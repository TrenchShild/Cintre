# IA sur l'appareil

Ces fichiers sont utilisés par Cintre directement dans le navigateur (aucun serveur, aucune clé, aucune photo envoyée).

| Fichier | Rôle | Origine | Licence |
|---|---|---|---|
| `u2netp.onnx` | Détourage (retrait du fond) | U²-Net, version légère « u2netp » (Qin et al., 2020), export ONNX de [rembg](https://github.com/danielgatis/rembg) | Apache 2.0 ([U-2-Net](https://github.com/xuebinqin/U-2-Net)) |
| `labels.json` | Descriptions précalculées des types de vêtements et des couleurs | Calculées avec l'encodeur de texte de [Marqo-FashionSigLIP](https://huggingface.co/Marqo/marqo-fashionSigLIP) | Apache 2.0 |

Le modèle de vision Marqo-FashionSigLIP (`vision_model_q4.onnx`, environ 61 Mo, licence Apache 2.0) est téléchargé depuis Hugging Face à la première utilisation, puis gardé en cache sur l'appareil.

Moteur d'exécution : [ONNX Runtime Web](https://github.com/microsoft/onnxruntime) 1.30.0 (licence MIT), chargé depuis jsDelivr.
