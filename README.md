# Juicebox Fee Discrepancy
* Juicebox JBX membership fees according to [docs.juicebox.money](https://docs.juicebox.money/dev/learn/overview/#jbx-membership-fee):
    > All funds distributed by projects from their treasuries to destinations outside of the Juicebox ecosystem (i.e. distributions that do not go to other Juicebox treasuries) will incure a protocol fee

    > Any funds sent from one juicebox treasury to another via splits do not incur fees.
* On July 25, 2023 (block 17773178) (timestamp 1690325267) `jbdao.eth` migrated the Juicebox project payment terminal from `JBETHPaymentTerminal3_1` to  `JBETHPaymentTerminal3_1_1`

  * [Safe txn view](<https://app.safe.global/transactions/tx?safe=eth:0xAF28bcB48C40dBC86f52D459A6562F658fc94B1e&id=multisig_0xAF28bcB48C40dBC86f52D459A6562F658fc94B1e_0x321283c2ff6c1c9035e0c11fc39859ffde3a3a951d02f8686c0b3f05c23cd89c>)
  * [Etherscan](<https://etherscan.io/tx/0x333706712af4d8fe6bba072cdeb2ea9ce49ceb98d8bd9cb77ec49c01d03de54f>)

* On August 22, 2023 (block 17973808) (timestamp 1692750203) `jbdao.eth` migrated the Juicebox project payment terminal from `JBETHPaymentTerminal3_1_1` to `JBETHPaymentTerminal3_1_2`
  * [Safe txn view](<https://app.safe.global/transactions/tx?safe=eth:0xAF28bcB48C40dBC86f52D459A6562F658fc94B1e&id=multisig_0xAF28bcB48C40dBC86f52D459A6562F658fc94B1e_0x9ba3e0379cbabeb224b58bd24cbc4b868fcdf09e5847757ecfdc3a8c71c64a51>)
  * [Etherscan](<https://etherscan.io/tx/0x9077ce0dda1bea5ecef230f6ab2c441707d76d4b040eef6c77e723704db54374>)

* After these migrations there should have been an additional transaction to `setFeelessAddress` of all previous terminals as was done when migration from `JBETHPaymentTerminal` to `JBETHPaymentTerminal3_1` occurred
  * [Safe txn view](<https://app.safe.global/transactions/tx?safe=eth:0xAF28bcB48C40dBC86f52D459A6562F658fc94B1e&id=multisig_0xAF28bcB48C40dBC86f52D459A6562F658fc94B1e_0x82c31c79e6c7a9ab7fcea788d136a8a276e494c4e91ad286e7d306686a593f82>)

* It can be confirmed that the previous payment terminals are not set as feeless by checking the `isFeelessAddress` function
  * https://etherscan.io/address/0x457cD63bee88ac01f3cD4a67D5DCc921D8C0D573#readContract#F12
    * `0x594Cb208b5BB48db1bcbC9354d1694998864ec63`
    * `0xFA391De95Fcbcd3157268B91d8c7af083E607A5C`
  * https://etherscan.io/address/0x1d9619E10086FdC1065B114298384aAe3F680CC0#readContract#F12
    * `0x594Cb208b5BB48db1bcbC9354d1694998864ec63`
    * `0xFA391De95Fcbcd3157268B91d8c7af083E607A5C`
    * `0x457cD63bee88ac01f3cD4a67D5DCc921D8C0D573`

* Since the previous payment terminals were NOT set as feeless, all `distributePayoutsOf` from Juicebox to other projects NOT using the same terminal as Juicebox incurred an incorrect 2.5% protocol fee
* This discovery was made on July 29, 2024, ([Discord message](https://discord.com/channels/775859454780244028/915334655144787998/1267512080781676626))

## Gathering Affected Payouts
* To determine all affected payouts we first gather all `payEvents` from Juicebox that do not use the specific terminal address for each time period
  * July 25, 2023 - August 22, 2023, any project not using `0x457cD63bee88ac01f3cD4a67D5DCc921D8C0D573` as their payment terminal incurred a 2.5% fee
    * GraphQL query for all payouts from Juicebox that do not use `JBETHPaymentTerminal3_1_1`<br>https://subgraph.satsuma-prod.com/juicebox/mainnet/playground
    ```
      {
        payEvents(
          where: {
            distributionFromProjectId: 1,
            terminal_not: "0x457cD63bee88ac01f3cD4a67D5DCc921D8C0D573",
            timestamp_gt: 1690325267,
            timestamp_lt: 1692750203
          }
          first: 1000
          orderBy: timestamp
          orderDirection: desc
        ) {
          projectId
          terminal
          amount
          txHash
        }
      }
    ```
  * August 22, 2023 - present, any project not using `0x1d9619E10086FdC1065B114298384aAe3F680CC0` as their payment terminal incurred a 2.5% fee
    * GraphQL query for all payouts from Juicebox that do not use `JBETHPaymentTerminal3_1_2`<br>https://subgraph.satsuma-prod.com/juicebox/mainnet/playground
    ```
    {
      payEvents(
        where: {
          distributionFromProjectId: 1
          terminal_not: "0x1d9619E10086FdC1065B114298384aAe3F680CC0"
          timestamp_gt: 1692750203
          
        },
        first: 1000 
        orderBy: timestamp
        orderDirection: desc
      ) {
        projectId
        terminal
        amount
        txHash
      }
    }
    ```
* From these queries there are 26 unique transactions, we take these transactions and projectIds to find the corresponding `distributePayoutsOf` from Juicebox
  * GraphQL query for all `distributePayoutsOf` from Juicebox that correspond to the 26 unique transactions that have payouts to projects not on the same terminal<br>https://subgraph.satsuma-prod.com/juicebox/mainnet/playground
    ```
    {
      distributePayoutsEvents(
        where: {
          projectId: 1
          txHash_in: ["0xc327698bbb510c82d265fca5bdc9c3aa44b31239ced71d902a6a5cdab4d9a78f","0xb00f804186294cac0824dbe978ba1fcd48fa4b4fd475d40bdf977feec06d475f","0x34d57b85af1271336b08f18b0d7f5ee242a2a10f577f5a62b8377c6872cf3aa5","0xba576149e92be9366329a045a0fc8920dc0bb39ce020f392b0884b2d4f471bab","0x391734536d46125bf0b047640a4d64d0710f536d4e0cf95c7ce7c660cdaa6c41","0xd9ff3238c6d33e958b7e89b125cb160e53f47589f95e611a0db12b5822beb8cb","0x767eb20b58f7202607eac6c0529fe7801c7ea2ef27090fedbad76cf5952d2617","0x9651cc89e4477254b8a83871e6c9dc98f556dc0a95941e2f9f1664e7a29b25bd","0x3462df5696385b1eea4bb9318f5b732e17eda1ba8fe2b8ae62d350b219ea1713","0xa68d0c454f0ac0308635a3f740d8ea84190de6958d342a0ce9540435a0a94c9a","0x4b5636634b6727bb65bc3d048a99a65ef6afe9a92f3e092c6880d0ef34f2652f","0x5f24d246a8460e2b0b2d8e162a3d84222d4d11a8ad3e059039d2fdb596f4f1f8","0x151cef0cc263742fe713f843af4f4bebe7d42b95bccfe0ddba776f97ed4d801f","0x011f3b34bc27e18325fb2d628757b29b5205945340dff4aed5de161da8af2a63","0x5d5eacb510cfdbca8e3a94f1af8130b45d3c5f975c5ae0d37a7b9992baa7234c","0xc56d90e096541caa32807c1c553ac7b839e1ae4748a70a0f4fdcc0a168ba0028","0xe098e25f7423f5a893d36bb585d3429a4c510ca89e3e915514c817ea75d3cfd6","0xc31b1cac952e0c2416dd95132488e2c1db3e040e511248f4a7f2a7f45a6bd9e1","0x591c08dcf85432aa71902b82f8ad2f23b09d209126215d62ba283a8d4442182a","0x74d4902551cb0bc1907e8ceca233628c9527bb78859392fc113e2520bff24e42","0x887b0a9b97361497fef7a3edeaab61e8af54035ffc68c6081c02658f9bcfe151","0x988f527dde8bf522f242ea0b76b4336baac2c2a4e1984dddb033689e83dc3f23","0xce112ad5992ce60cac3186f2db946cb4a177548b5b988bb9845733126f2900bd","0x0b4859724a3a23718b7f76914ed1527fa62150dad083d819ed3bfc404f0514b3","0xf5ffd20ce87e9d4ca18bacb20565ffb02fc6325f6f3a1cabf710823ae0e4f115","0x5943973c6a7c884d74a9cc79ff0fcd0c8e34af718baabd65019f2955dd2aa95c"]
        }
        orderBy: fundingCycleNumber
        orderDirection: desc
      ) {
        fundingCycleNumber
        distributedAmount
        fee
        splitDistributions(
          where: {
            splitProjectId_in: [387,397,421,470,477,488,549,552]
          }
        ) {
          splitProjectId
          amount
          txHash
        }
      }
    }
    ```
* Next we link the `distributePayoutsEvents` to the corresponding `payEvent` to determine the amount of the fee that was incorrectly charged
* Then we sum the total amount of incorrect fees charged to each project
  
## Results

| ProjectId |                     Project Name & Link                      | Excess Fees Charged (ETH) |
| :-------: | :----------------------------------------------------------: | :-----------------------: |
|    387    |   [@wagmi-studios](https://juicebox.money/@wagmi-studios)    |   1.055030557777181604    |
|    397    |            [@peel](https://juicebox.money/@peel)             |   8.892181052298771322    |
|    421    | [@exhausted-pigeon](https://juicebox.money/@exhausted-pigeon)|   2.059416717385266471    |
|    470    |      [@breadfruit](https://juicebox.money/@breadfruit)       |   1.605713071553927699    |
|    477    |       [@nance-app](https://juicebox.money/@nance-app)        |   1.970929431515883919    |
|    488    |         [Bananapus](https://juicebox.money/v2/p/488)         |   1.761242616497408637    |
|    549    |  [Sablier V2 Interop Dev](https://juicebox.money/v2/p/549)   |   0.059078174758318802    |
|    552    |       [@juicecast](https://juicebox.money/@juicecast)        |   1.306116252162166165    |
|           |                          **TOTAL**                           | **18.709707873948924619** |

  
### Contract addresses
`JBETHPaymentTerminal`: [0x594Cb208b5BB48db1bcbC9354d1694998864ec63](https://etherscan.io/address/0x594Cb208b5BB48db1bcbC9354d1694998864ec63)

`JBETHPaymentTerminal3_1`: [0xFA391De95Fcbcd3157268B91d8c7af083E607A5C](https://etherscan.io/address/0xFA391De95Fcbcd3157268B91d8c7af083E607A5C)

`JBETHPaymentTerminal3_1_1`: [0x457cD63bee88ac01f3cD4a67D5DCc921D8C0D573](https://etherscan.io/address/0x457cD63bee88ac01f3cD4a67D5DCc921D8C0D573)

`JBETHPaymentTerminal3_1_2`: [0x1d9619E10086FdC1065B114298384aAe3F680CC0](https://etherscan.io/address/0x1d9619E10086FdC1065B114298384aAe3F680CC0)