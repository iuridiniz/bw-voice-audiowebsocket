import chalk from 'chalk'
import express from 'express'

export const createHttpServer = async port => {
  return express()
    .use(express.json())
    .use(express.urlencoded({ extended: true }))
    .listen(port, () => console.log(chalk.dim.gray(`HTTP listening at port ${port}`)))
}
