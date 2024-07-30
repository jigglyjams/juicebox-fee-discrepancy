# Juicebox Fee Discrepancy
* on July 25, 2023 (block 17773178) (timestamp 1690325267) `jbdao.eth` migrated the Juicebox project payment terminal from `JBETHPaymentTerminal3_1` to  `JBETHPaymentTerminal3_1_1`

  * [Safe txn view](<https://app.safe.global/transactions/tx?safe=eth:0xAF28bcB48C40dBC86f52D459A6562F658fc94B1e&id=multisig_0xAF28bcB48C40dBC86f52D459A6562F658fc94B1e_0x321283c2ff6c1c9035e0c11fc39859ffde3a3a951d02f8686c0b3f05c23cd89c>)
  * [Etherscan](<https://etherscan.io/tx/0x333706712af4d8fe6bba072cdeb2ea9ce49ceb98d8bd9cb77ec49c01d03de54f>)

* on August 22, 2023 (block 17973808) (timestamp 1692750203) `jbdao.eth` migrated the Juicebox project payment terminal from `JBETHPaymentTerminal3_1_1` to `JBETHPaymentTerminal3_1_2`
  * [Safe txn view](<https://app.safe.global/transactions/tx?safe=eth:0xAF28bcB48C40dBC86f52D459A6562F658fc94B1e&id=multisig_0xAF28bcB48C40dBC86f52D459A6562F658fc94B1e_0x9ba3e0379cbabeb224b58bd24cbc4b868fcdf09e5847757ecfdc3a8c71c64a51>)
  * [Etherscan](<https://etherscan.io/tx/0x9077ce0dda1bea5ecef230f6ab2c441707d76d4b040eef6c77e723704db54374>)

* After these migrations there should have been an additional transaction to `setFeelessAddress` of all previous terminals as was done when the migration from `JBETHPaymentTerminal` to `JBETHPaymentTerminal3_1` occurred
  * [Safe txn view](<https://app.safe.global/transactions/tx?safe=eth:0xAF28bcB48C40dBC86f52D459A6562F658fc94B1e&id=multisig_0xAF28bcB48C40dBC86f52D459A6562F658fc94B1e_0x82c31c79e6c7a9ab7fcea788d136a8a276e494c4e91ad286e7d306686a593f82>)

* Since no feeless addresses were set, all `distributePayoutsOf` from Juicebox to other projects NOT using the same terminal as Juicebox incurred an incorrect 2.5% protocol fee
  * July 25, 2023 - August 22, 2023, any project not using `0x457cD63bee88ac01f3cD4a67D5DCc921D8C0D573` as their payment terminal incurred a 2.5% fee
  * August 22, 2023 - present, any project not using `0x1d9619E10086FdC1065B114298384aAe3F680CC0` as their payment terminal incurred a 2.5% fee

### Contract addresses
`JBETHPaymentTerminal`: [0x594Cb208b5BB48db1bcbC9354d1694998864ec63](https://etherscan.io/address/0x594Cb208b5BB48db1bcbC9354d1694998864ec63)

`JBETHPaymentTerminal3_1`: [0xFA391De95Fcbcd3157268B91d8c7af083E607A5C](https://etherscan.io/address/0xFA391De95Fcbcd3157268B91d8c7af083E607A5C)

`JBETHPaymentTerminal3_1_1`: [0x457cD63bee88ac01f3cD4a67D5DCc921D8C0D573](https://etherscan.io/address/0x457cD63bee88ac01f3cD4a67D5DCc921D8C0D573)

`JBETHPaymentTerminal3_1_2`: [0x1d9619E10086FdC1065B114298384aAe3F680CC0](https://etherscan.io/address/0x1d9619E10086FdC1065B114298384aAe3F680CC0)