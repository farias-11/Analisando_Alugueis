# Analisando uma base pública de aluguéis e identificar os bairros com maior valor médio de aluguel.

import pandas as pd
import matplotlib.pyplot as plt

#Lendo a base de dados pública diretamente da internet
url = 'https://raw.githubusercontent.com/alura-cursos/pandas-conhecendo-a-biblioteca/main/base-de-dados/aluguel.csv'
df = pd.read_csv(url, sep=';')

#Visualizando as primeiras linhas e informações básicas
print("Prévia dos dados:")
print(df.head(), "\n")

#Verificando valores ausentes (para evitar erros em cálculos)
print("Valores ausentes por coluna:")
print(df.isnull().sum(), "\n")

#Removendo linhas com valores nulos nas colunas principais
df = df.dropna(subset=['Valor', 'Bairro', 'Quartos'])

#Exibindo informações gerais sobre o conjunto de dados
print(f"Total de registros após limpeza: {len(df)}")
print(f"Bairros únicos: {df['Bairro'].nunique()}")
print(f"Média de quartos por imóvel: {df['Quartos'].mean():.2f}\n")

#Calculando o valor médio de aluguel por bairro e selecionando o top 5
top_bairros = (
    df.groupby('Bairro')['Valor']
    .mean()
    .sort_values(ascending=False)
    .head(5)
    .round(2)
    .reset_index()
)

print("Top 5 bairros com aluguel médio mais alto:")
print(top_bairros, "\n")

#Plotando o gráfico horizontal com os resultados
plt.figure(figsize=(8, 5))
plt.barh(top_bairros['Bairro'], top_bairros['Valor'], color='#3b82f6')
plt.xlabel('Valor médio do aluguel (R$)')
plt.title('Top 5 Bairros com Aluguel Médio Mais Alto')
plt.show()