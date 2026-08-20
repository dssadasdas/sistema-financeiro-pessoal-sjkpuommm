export const CATEGORY_EMOJIS: Record<string, string> = {
  Alimentação: '🛒',
  Moradia: '🏠',
  Transporte: '🚗',
  Lazer: '🎮',
  Saúde: '💊',
  Educação: '📚',
  Vestuário: '👕',
  Compras: '🛍️',
  Assinaturas: '📱',
  Luz: '💡',
  Água: '💧',
  Combustível: '⛽',
  'Taxas e tarifas': '🏦',
  'Fatura de cartão': '💳',
  Casa: '🏡',
  Eletrônicos: '💻',
  Investimentos: '📈',
  Salário: '💼',
  'Renda Extra': '💵',
  Outros: '💰',
  Outro: '💰',
}

export function getCategoryEmoji(category?: string | null): string {
  if (!category) return '💰'
  const trimmed = category.trim()
  if (CATEGORY_EMOJIS[trimmed]) return CATEGORY_EMOJIS[trimmed]

  const lower = trimmed.toLowerCase()
  if (
    lower.includes('alimen') ||
    lower.includes('mercado') ||
    lower.includes('restaurante') ||
    lower.includes('comida') ||
    lower.includes('lanche') ||
    lower.includes('feira') ||
    lower.includes('supermercado')
  ) {
    return '🛒'
  }
  if (
    lower.includes('mora') ||
    lower.includes('casa') ||
    lower.includes('aluguel') ||
    lower.includes('condomínio') ||
    lower.includes('condominio')
  ) {
    return '🏠'
  }
  if (
    lower.includes('transp') ||
    lower.includes('uber') ||
    lower.includes('carro') ||
    lower.includes('moto') ||
    lower.includes('ônibus') ||
    lower.includes('onibus') ||
    lower.includes('combust')
  ) {
    return lower.includes('combust') || lower.includes('gasolina') ? '⛽' : '🚗'
  }
  if (
    lower.includes('lazer') ||
    lower.includes('jogo') ||
    lower.includes('game') ||
    lower.includes('cinema') ||
    lower.includes('viagem') ||
    lower.includes('passeio') ||
    lower.includes('diversão')
  ) {
    return '🎮'
  }
  if (
    lower.includes('saúde') ||
    lower.includes('saude') ||
    lower.includes('médic') ||
    lower.includes('medic') ||
    lower.includes('farmácia') ||
    lower.includes('farmacia') ||
    lower.includes('dentista') ||
    lower.includes('hospital')
  ) {
    return '💊'
  }
  if (
    lower.includes('educa') ||
    lower.includes('escola') ||
    lower.includes('curso') ||
    lower.includes('faculdade') ||
    lower.includes('livro')
  ) {
    return '📚'
  }
  if (
    lower.includes('vest') ||
    lower.includes('roupa') ||
    lower.includes('calçado') ||
    lower.includes('calcado') ||
    lower.includes('moda')
  ) {
    return '👕'
  }
  if (lower.includes('compra') || lower.includes('shopping')) {
    return '🛍️'
  }
  if (lower.includes('luz') || lower.includes('energia')) {
    return '💡'
  }
  if (lower.includes('água') || lower.includes('agua') || lower.includes('saneamento')) {
    return '💧'
  }
  if (
    lower.includes('assin') ||
    lower.includes('stream') ||
    lower.includes('netflix') ||
    lower.includes('spotify') ||
    lower.includes('internet') ||
    lower.includes('celular') ||
    lower.includes('telefone')
  ) {
    return '📱'
  }
  if (
    lower.includes('invest') ||
    lower.includes('ação') ||
    lower.includes('cripto') ||
    lower.includes('fii')
  ) {
    return '📈'
  }
  if (lower.includes('fatura') || lower.includes('cartão') || lower.includes('cartao')) {
    return '💳'
  }
  if (
    lower.includes('taxa') ||
    lower.includes('tarifa') ||
    lower.includes('banco') ||
    lower.includes('iof') ||
    lower.includes('juros')
  ) {
    return '🏦'
  }
  if (
    lower.includes('eletr') ||
    lower.includes('informática') ||
    lower.includes('informatica') ||
    lower.includes('tech')
  ) {
    return '💻'
  }
  if (
    lower.includes('salário') ||
    lower.includes('salario') ||
    lower.includes('trabalho') ||
    lower.includes('pagamento')
  ) {
    return '💼'
  }
  if (
    lower.includes('renda') ||
    lower.includes('extra') ||
    lower.includes('freelance') ||
    lower.includes('bico')
  ) {
    return '💵'
  }

  return '💰'
}
