# Bravio Food House: cardápio com checkout

O que o site faz:

- Mostra o cardápio com fotos, adicionais e opções para retirar ingredientes.
- Tem um checkout em 4 etapas: **Sacola → Entrega → Pagamento → Revisão**.
- Calcula a **taxa de entrega pela distância (km)** entre a loja e o endereço do cliente. O cliente pode digitar o CEP (a rua e o bairro são preenchidos sozinhos) ou usar a localização do celular.
- Aceita **pagamento online** (Pix ou cartão, pelo Mercado Pago) ou **pagamento na entrega**.
- Envia o pedido completo para o seu WhatsApp, com os itens, o total, o endereço, um link do mapa e, quando o cliente pagou online, a confirmação "PAGO ONLINE" com o número do pagamento.

---

## 1. Ajuste os seus dados (arquivo `public/catalogo.js`)

Abra o arquivo em qualquer editor de texto e altere:

| Campo | O que colocar |
|---|---|
| `loja: { lat, lng }` | Já está no Tatuquara (aproximado). Para ficar exato, abra o Google Maps, clique com o botão direito no endereço da hamburgueria e clique nos números que aparecem (ex.: -25.4284, -49.2733). Isso copia as coordenadas. |
| `frete` | A tabela de taxas por km, já ajustada para a região do Tatuquara: até 3 km R$ 5, até 6 km R$ 7, até 9 km R$ 9, até 12 km R$ 12 e até 15 km R$ 15. Acima disso, o site mostra "fora da área". Mude os valores como quiser. |
| `freteGratisAcima` | Por exemplo, `80` deixa o frete grátis em pedidos acima de R$ 80. Use `0` para desligar. |
| `pedidoMinimo` | O valor mínimo do pedido. Use `0` para não ter mínimo. |
| `fatorRota` | O site mede a distância em linha reta e multiplica por esse número para estimar o caminho pelas ruas. O padrão é 1,3. Se as taxas ficarem baixas, aumente para 1,4. |
| `metaPixelId` | Opcional. É o ID do seu Pixel da Meta, que serve para medir as campanhas. |
| Produtos e preços | Ficam na lista `PRODUTOS`. |

## 2. Crie a conta no Mercado Pago

1. Crie uma conta de vendedor (pessoa física ou CNPJ) em mercadopago.com.br.
2. Acesse **mercadopago.com.br/developers**, clique em **Suas integrações** e depois em **Criar aplicação**. Escolha "Pagamentos online" e "Checkout Pro".
3. Em **Credenciais de produção**, copie o **Access Token**. Ele começa com `APP_USR-`.
   - **Não coloque esse token no arquivo `catalogo.js` nem mande para ninguém.** Ele fica só no painel da Netlify (passo 3).
4. Para testar antes de valer de verdade, use primeiro as **Credenciais de teste**, que começam com `TEST-`.

## 3. Coloque o site no ar (Netlify, gratuito)

1. Crie uma conta em **netlify.com**.
2. Clique em **Add new site** e depois em **Deploy manually**. Arraste a pasta `bravio` inteira, que contém `public`, `netlify` e `netlify.toml`.
   - Se o envio manual não ativar as funções (`/api/...`), use o **Netlify CLI** ou envie a pasta para o GitHub e conecte o repositório. Assim as funções sempre são publicadas.
3. Vá em **Site configuration**, depois **Environment variables**, e adicione:
   - `MP_ACCESS_TOKEN`: o token do Mercado Pago
   - `SITE_URL`: o endereço do seu site, por exemplo `https://bravioburger.com.br`
4. Faça um novo deploy, em **Deploys** e depois **Trigger deploy**.

## 4. Conecte o seu domínio

1. Registre o domínio no **registro.br** (ex.: `bravioburger.com.br`).
2. Na Netlify, vá em **Domain management**, clique em **Add domain** e digite o seu domínio.
3. No registro.br, troque os servidores DNS pelos que a Netlify mostrar. A troca leva algumas horas para valer. O HTTPS é ativado sozinho.

## 5. Teste antes de divulgar

- Faça um pedido com **pagamento na entrega** e veja se a mensagem chega no WhatsApp.
- Faça um pedido **online** com as credenciais de teste do Mercado Pago (os cartões de teste estão na documentação do Mercado Pago).
- Teste endereços perto e longe da loja e confira se as taxas batem com a sua tabela.
- Quando tudo estiver certo, troque o token de teste pelo de produção.

---

## Bom saber

- **Segurança dos preços:** o valor cobrado no Mercado Pago é recalculado no servidor, a partir do `catalogo.js`. Ninguém consegue alterar o preço pelo navegador.
- **Pedido pago e não enviado:** depois de pagar, o cliente volta ao site e toca em "Enviar no WhatsApp". Se ele fechar a página antes disso, o pagamento continua registrado no Mercado Pago, com nome, telefone e endereço nos detalhes. Por isso, deixe as notificações do app do Mercado Pago ligadas.
- **Mapa:** o endereço é localizado pelo OpenStreetMap, que é gratuito. Se algum endereço não for encontrado, o cliente pode usar a localização do celular.
- **Para mudar preço ou produto,** edite o `catalogo.js` e publique de novo (arraste a pasta outra vez).
