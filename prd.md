# 📄 PRD – Application ChatPDF (LLM + RAG)

## 1. Présentation générale

### 1.1 Nom du produit
ChatPDF 

### 1.2 Vision produit
Permettre aux utilisateurs d’uploader des documents PDF et d’interagir avec leur contenu via un chatbot intelligent basé sur un LLM et une architecture RAG (Retrieval-Augmented Generation).

### 1.3 Problème utilisateur
Les utilisateurs passent beaucoup de temps à lire, analyser et chercher des informations dans des documents PDF longs et complexes (rapports, cours, contrats, articles).

### 1.4 Solution proposée
Une application web permettant :
- l’upload de PDF,
- l’indexation intelligente du contenu,
- la discussion en langage naturel avec les documents,
- la génération de résumés et l’extraction d’informations clés.

---

## 2. Objectifs & métriques de succès

### 2.1 Objectifs business
- Réduire le temps d’analyse des documents
- Offrir une expérience utilisateur fluide et fiable
- Préparer une base solide pour un modèle SaaS

### 2.2 Objectifs utilisateurs
- Obtenir des réponses rapides et pertinentes
- Comprendre un document sans le lire intégralement
- Avoir confiance dans les réponses grâce aux sources


---

## 3. Utilisateurs cibles

### 3.1 Personas

Étudiant
- Utilise des supports de cours et articles PDF
- Demande des résumés et explications simplifiées

Professionnel
- Analyse des rapports et documents internes
- Recherche d’informations précises

Juridique / Finance
- Consulte des contrats et documents réglementaires
- Nécessite des réponses exactes avec citations

---

## 4. Fonctionnalités clés

### 4.1 Upload et gestion des documents

- Upload de fichiers PDF (drag & drop)
- Taille maximale configurable (ex: 20–50 MB)
- Support des PDF multi-pages
- Gestion des erreurs (format invalide, fichier corrompu)


---

### 4.2 Prétraitement des documents

Pipeline de traitement :
1. Extraction du texte depuis le PDF
2. Nettoyage et normalisation du texte
3. Découpage en chunks (500–1000 tokens)
4. Génération d’embeddings
5. Stockage dans une base vectorielle

---

### 4.3 Chat avec les documents (RAG)

Fonctionnalités :
- Interface de chat type ChatGPT
- Questions en langage naturel
- Réponses basées uniquement sur le contenu du PDF
- Citations des sources (page, section)
- Historique de conversation par document

Cas d’usage :
- "Résume ce document en 5 points"
- "Que dit le document à propos de X ?"
- "Quels sont les risques mentionnés ?"
- "Explique ce passage simplement"

---

### 4.4 Résumé automatique

Types de résumés :
- Résumé global du document
- Résumé par section
- Résumé personnalisé (longueur définie par l’utilisateur)


---

## 5. Architecture technique

### 5.1 Vue d’ensemble

Frontend
- Application web next js
- détail de ui : Section pour Upload PDF +  Section de chat

Backend
- langchain 
- python
- Orchestration RAG

Pipeline RAG
1. Question utilisateur
2. Embedding de la question
3. Recherche vectorielle (Top-K chunks)
4. Enrichissement du prompt avec le contexte
5. Appel au LLM
6. Génération de la réponse + sources

---

### 5.2 Stack technique (suggestion)

- Frontend : Next js
- Backend : python , langchain
- LLM : openai
- Embeddings : OpenAI 
- Vector DB : Pinecone 

---

## 8. UX / UI – Principes

- Interface simple et intuitive
- Indicateurs de chargement et d’indexation
- Sources clairement visibles dans les réponses
- Messages d’erreur compréhensibles

---

## 9. Roadmap produit

### MVP (v1)
- Upload de PDF
- Chat avec RAG
- Résumé simple
- Support multi-documents