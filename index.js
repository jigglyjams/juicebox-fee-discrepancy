import "dotenv/config";
import { request, gql } from "graphql-request";
import { formatUnits } from "@ethersproject/units";

const terminal3_1_1_contract = "0x457cD63bee88ac01f3cD4a67D5DCc921D8C0D573"
const terminal3_1_1_start = new Date("Jul-25-2023 10:47:47 PM UTC").getTime() / 1000

const terminal3_1_2_contract = "0x1d9619E10086FdC1065B114298384aAe3F680CC0"
const terminal3_1_2_start = new Date("Aug-23-2023 12:23:23 AM UTC").getTime() / 1000

const API_KEY = process.env.SUBGRAPH_API_KEY;
const API_URL = `https://subgraph.satsuma-prod.com/${API_KEY}/juicebox/mainnet/api`

let projectIdToPayout = {};
let projectIdToDistribution = {};
let txHashSet = new Set();

async function main() {
  const payEventsT311 = await getTerminalPayEvents(terminal3_1_1_contract, terminal3_1_1_start, terminal3_1_2_start);
  const payEventsT312 = await getTerminalPayEvents(terminal3_1_2_contract, terminal3_1_2_start);
  const payEvents = payEventsT311.concat(payEventsT312);
  payEvents.forEach((payEvent) => {
    txHashSet.add(payEvent.txHash);
    const { projectId, amount, terminal, txHash } = payEvent;
    if (!projectIdToPayout[projectId]) {
      projectIdToPayout[projectId] = [];
    }
    projectIdToPayout[projectId].push({
      amount,
      terminal,
      txHash
    })
  });

  const relevantDistributionEvents = await getDistributionEvents([...txHashSet], Object.keys(projectIdToPayout));
  relevantDistributionEvents.forEach((distributionEvent) => {
    const { fundingCycleNumber, splitDistributions } = distributionEvent;
    splitDistributions.forEach((splitDistribution) => {
      const { splitProjectId, amount, txHash } = splitDistribution;
      if (!projectIdToDistribution[splitProjectId]) {
        projectIdToDistribution[splitProjectId] = [];
      }
      projectIdToDistribution[splitProjectId].push({
        fundingCycleNumber,
        amount,
        txHash
      })
    });
  });
  
  // iterate over projectIdToDistribution, subtract distribution amount from amount received from payEvent
  let projectIdToDiscrepancy = {};
  Object.entries(projectIdToDistribution).forEach(([projectId, distributionEvents]) => {
    projectIdToDiscrepancy[projectId] = [];
    distributionEvents.forEach((distributionEvents) => {
      const txnHash = distributionEvents.txHash;
      // get the payEvent for this txnHash
      const payEvent = projectIdToPayout[projectId].find((payEvent) => payEvent.txHash === txnHash);
      if (!payEvent) {
        throw new Error(`PayEvent not found for txHash: ${txnHash}`);
      }
      const distributedAmount = BigInt(distributionEvents.amount);
      const receivedAmount = BigInt(payEvent.amount);
      const discrepancy = distributedAmount - receivedAmount;
      projectIdToDiscrepancy[projectId].push(discrepancy);
    });
  });
  console.log(projectIdToDiscrepancy);
  // sum the discrepancies
  let projectIdToTotalDiscrepancy = {};
  Object.entries(projectIdToDiscrepancy).forEach(([projectId, discrepancies]) => {
    projectIdToTotalDiscrepancy[projectId] = discrepancies.reduce((acc, discrepancy) => acc + discrepancy, 0n);
    console.log(`ProjectId: ${projectId}, Total discrepancy: ${formatUnits(String(projectIdToTotalDiscrepancy[projectId]), "ether")} ETH`);
  });
  // console.log(projectIdToTotalDiscrepancy);
  // print sum of discrepancies
  let totalDiscrepancy = String(Object.values(projectIdToTotalDiscrepancy).reduce((acc, discrepancy) => acc + discrepancy, 0n));
  console.log(`Total discrepancy: ${formatUnits(totalDiscrepancy, "ether")} ETH`);
}

async function getTerminalPayEvents(terminal_not, timestamp_gt, timestamp_lt = undefined) {
  const query = gql`{
    payEvents(
      where: {
        distributionFromProjectId: 1
        terminal_not: "${terminal_not}"
        timestamp_gt: ${timestamp_gt}
        ${timestamp_lt ? `timestamp_lt: ${timestamp_lt}` : ""}
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
  }`;
  // console.log(query);
  const data = await request(API_URL, query);
  const { payEvents } = data;
  return payEvents;
}

async function getDistributionEvents(txHashArray, projectIdArray) {
  const query = gql`{
    distributePayoutsEvents(
      where: {
        projectId: 1
        txHash_in: [${txHashArray.map((txHash) => `"${txHash}"`).join(",")}]
      }
      orderBy: fundingCycleNumber
      orderDirection: desc
    ) {
      fundingCycleNumber
      distributedAmount
      fee
      splitDistributions(
        where: {
          splitProjectId_in: [${projectIdArray}]
        }
      ) {
        splitProjectId
        amount
        txHash
      }
    }
  }`;
  // console.log(query);
  const data = await request(API_URL, query);
  const { distributePayoutsEvents } = data;
  return distributePayoutsEvents;
}


main();