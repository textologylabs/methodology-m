const express = require('express')
const cors = require('cors')
const { <collection> } = require('./api-read')

const app = express()
app.use(cors())
app.use(express.json())

let nextId = 1

app.post('/<resource>', (req, res) => {
  const { <field> } = req.body || {}
  if (!<field> || !<field>.trim()) {
    return res.status(400).json({ error: '<Field> is required' })
  }
  const item = { id: nextId++, <field>: <field>.trim() }
  <collection>.push(item)
  res.status(201).json(item)
})

app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

const PORT = process.env.STUB_WRITE_PORT || <write-port>
app.listen(PORT, () => {
  console.log('<api-name> stub on port ' + PORT)
})
