import express from 'express';

const server = express()

const PORT = 10000

server.all("/", (req, res) => {
  res.send("Bot is running!")
})

function keepAlive() {
  server.listen(PORT, () => {
    console.log(`Server is ready on port ${PORT}.`)
  })
}

export default keepAlive