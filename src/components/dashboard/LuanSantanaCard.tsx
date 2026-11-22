import { useState } from 'react'
import { Card } from '@/components/ui'

interface LuanSantanaCardProps {
  todayISO: string
  nome?: string
}

const FRASES_MOTIVACIONAIS = [
  'Bom dia, {nome}! Você nasceu pra brilhar. Vai com tudo hoje que o mundo é pequeno pro seu talento!',
  '{nome}, cada exame hoje é um passo mais perto dos seus maiores sonhos. Confia no seu caminho!',
  'Te esperando no topo, {nome}! Hoje é dia de arrasar, faturar e cuidar de cada bichinho com esse coração gigante.',
  'Ei, {nome}! Não esquece nunca do quanto você é forte, dedicada e capaz. Seu dia vai ser incrível!',
  'Tudo que você quiser conquistar, {nome}, já começa com a sua coragem de levantar e fazer acontecer. Bora!',
  '{nome}, seu trabalho transforma vidas e salva patinhas. Tenha muito orgulho de quem você está se tornando!',
  'Acredita em você do jeito que eu acredito, {nome}: hoje vai ser um daqueles dias que dão gosto de viver!',
  'Meteoro de sucesso passando por aqui, {nome}! Respira fundo, sorri e vai conquistar o seu dia.',
  '{nome}, mesmo nos dias corridos, lembra que cada esforço seu está construindo a vida que você sempre sonhou.',
  'Sabe qual é o segredo de hoje, {nome}? Leveza no coração, foco na meta e a certeza de que você é imparável!',
  'Um dia de cada vez, uma clínica de cada vez, {nome}. Você está indo longe demais — continua firme!',
  '{nome}, que hoje não te falte energia, bons atendimentos e motivos pra sorrir no fim do dia!',
  'Quando bater o cansaço, {nome}, olha pro tanto que você já conquistou. Você é gigante!',
  'Hoje tem tudo pra ser um dia abençoado, {nome}. Vai com calma, com fé e com esse brilho que só você tem!',
  '{nome}, você faz tudo com tanto carinho que o sucesso é só consequência. Arrasa hoje!',
  'Deixa eu te lembrar uma coisa, {nome}: você é incrível no que faz e merece colher os melhores frutos!',
  'Que o seu dia seja leve, produtivo e cheio de notícias boas, {nome}. Tô na torcida por você!',
  '{nome}, foco no seu objetivo e sorriso no rosto! Cada detalhe do seu esforço vale muito a pena.',
  'Se hoje parecer puxado, {nome}, lembra: grandes histórias são feitas por mulheres determinadas como você.',
  'Bora fazer de hoje um dia inesquecível, {nome}! Sua dedicação é a sua maior estrela.',
  '{nome}, você tem dom, disciplina e coração bom. Não tem como dar errado — vai com tudo!',
  'Mais um dia pra você mostrar pro mundo a profissional maravilhosa que é, {nome}. Brilha muito!',
  '{nome}, cada meta batida começa com a atitude de hoje. Confia no processo que o melhor está vindo!',
  'Passando só pra te desejar um dia lindo, {nome}! Que seja cheio de paz, trabalho bom e realização.',
  'Não duvida nunca da sua força, {nome}. Você já venceu tanto e ainda vai conquistar muito mais!',
  '{nome}, cuida bem de você hoje também: bebe água, respira fundo e celebra cada pequena vitória!',
  'O universo conspira a favor de quem trabalha com amor, {nome}. Hoje vai ser sucesso total!',
  '{nome}, seu esforço silencioso está construindo resultados barulhentos. Continua que você está no caminho certo!',
  'A semana pode ser corrida, {nome}, mas sua determinação é maior que qualquer obstáculo. Vai lá e arrasa!',
  '{nome}, hoje é uma página em branco pronta pra mais um capítulo lindo da sua história. Escreve com orgulho!',
  'Tem gente que sonha e tem você, {nome}, que vai lá e realiza todos os dias. Admiração total!',
  '{nome}, que hoje cada trajeto seja tranquilo, cada atendimento seja leve e seu coração termine o dia em paz!',
]

function getDailyIndex(todayISO: string, total: number): number {
  const [year, month, day] = todayISO.split('-').map(Number)
  if (!year || !month || !day) return 0
  const utcDays = Math.floor(Date.UTC(year, month - 1, day) / 86_400_000)
  return ((utcDays % total) + total) % total
}

export function LuanSantanaCard({ todayISO, nome = 'Nathalia' }: LuanSantanaCardProps) {
  const [imgError, setImgError] = useState(false)
  const firstName = nome.trim().split(' ')[0] || 'Nathalia'
  const index = getDailyIndex(todayISO, FRASES_MOTIVACIONAIS.length)
  const frase = FRASES_MOTIVACIONAIS[index].replaceAll('{nome}', firstName)

  return (
    <Card className="p-3.5 sm:p-4 bg-gradient-to-r from-[#FAF7FF] via-white to-[#F5F1FC] dark:from-[#231D33] dark:via-[#1E1B29] dark:to-[#241E34] border-[#E8E0F7] dark:border-[#342B4B]">
      <div className="flex items-center gap-3">
        {/* Avatar Luan Santana */}
        <div className="shrink-0">
          <div className="w-13 h-13 rounded-full bg-gradient-to-br from-[#9B7BC7] via-[#B18EE0] to-[#6CC59A] p-[2px] shadow-sm">
            <div className="w-full h-full rounded-full bg-[#2A213C] overflow-hidden flex items-center justify-center">
              {!imgError ? (
                <img
                  src="/luan.jpg"
                  alt="Luan Santana"
                  onError={() => setImgError(true)}
                  className="w-full h-full object-cover object-top"
                />
              ) : (
                <span className="text-white font-extrabold text-sm tracking-tight select-none">
                  LS
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Balão / Mensagem do dia */}
        <div className="min-w-0 flex-1">
          <p className="text-xs font-extrabold text-[#4B3670] dark:text-[#DECFF7] truncate">
            Luan Santana
          </p>
          <p className="text-xs sm:text-sm text-[#4B4D50] dark:text-[#E2DCF0] leading-relaxed mt-0.5">
            &ldquo;{frase}&rdquo;
          </p>
        </div>
      </div>
    </Card>
  )
}
