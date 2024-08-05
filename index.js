import "dotenv/config";
import { request, gql } from "graphql-request";
import { formatEther } from "@ethersproject/units";

const terminal3_1_1_contract = "0x457cD63bee88ac01f3cD4a67D5DCc921D8C0D573"
const terminal3_1_1_start = new Date("Jul-25-2023 10:47:47 PM UTC").getTime() / 1000

const terminal3_1_2_contract = "0x1d9619E10086FdC1065B114298384aAe3F680CC0"
const terminal3_1_2_start = new Date("Aug-23-2023 12:23:23 AM UTC").getTime() / 1000

const API_KEY = process.env.SUBGRAPH_API_KEY;
const API_URL = `https://subgraph.satsuma-prod.com/${API_KEY}/juicebox/mainnet/api`

const projectLookup = {
  "387": {name: "@wagmi-studios", link: "https://juicebox.money/@wagmi-studios"},
  "397": {name: "@peel", link: "https://juicebox.money/@peel"},
  "421": {name: "@exhausted-pigeon", link: "https://juicebox.money/@exhausted-pigeon"},
  "470": {name: "@breadfruit", link: "https://juicebox.money/@breadfruit"},
  "477": {name: "@nance-app", link: "https://juicebox.money/@nance-app"},
  "488": {name: "Bananapus", link: "https://juicebox.money/v2/p/488"},
  "549": {name: "Sablier V2 Interop Dev", link: "https://juicebox.money/v2/p/549"},
  "552": {name: "@juicecast", link: "https://juicebox.money/@juicecast"}
};

let projectIdToPayout = {};
let projectIdToDistribution = {};
let txHashSet = new Set();

const FINDERS_FEE_PERCENTAGE = 15n;

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

  // sum the discrepancies
  let projectIdToTotalDiscrepancy = {};
  let projectIdToFindersFee = {};
  Object.entries(projectIdToDiscrepancy).forEach(([projectId, discrepancies]) => {
    projectIdToTotalDiscrepancy[projectId] = discrepancies.reduce((acc, discrepancy) => acc + discrepancy, 0n);
    const findersFee = (projectIdToTotalDiscrepancy[projectId] * FINDERS_FEE_PERCENTAGE) / 100n;
    projectIdToFindersFee[projectId] = findersFee;
  });

  // print discrepancies
  console.log("| ProjectId |                     Project Name & Link                       | Excess Fees Charged (ETH) | Finders fee (ETH)    |   After fee (ETH)     |");
  console.log("| :-------: | :----------------------------------------------------------:  | :-----------------------: | :---------------:    | :-----------------:   |");

  let totalExcessFees = 0n;
  let totalFindersFee = 0n;
  let totalAfterFee = 0n;

  Object.entries(projectIdToTotalDiscrepancy).forEach(([projectId, discrepancy]) => {
    const findersFee = (projectId !== "387") ? projectIdToFindersFee[projectId] : 0n;
    const afterFee = (projectId !== "387") ? discrepancy - findersFee : 0n;

    // Use the lookup table to get project name and link
    const project = projectLookup[projectId] || {name: "Unknown", link: "#"};
    const projectNameAndLink = `[${project.name}](${project.link})`;

    let discrepancyString = formatEther(discrepancy);
    let findersFeeString = formatEther(findersFee);
    let afterFeeString = formatEther(afterFee);
    if (projectId === "387") {
      discrepancyString = `*${discrepancyString}*`;
      findersFeeString = "N/A fees owed";
      afterFeeString = "N/A fees owed";
    }

    console.log(
      `| ${projectId.toString().padStart(9)} | ${projectNameAndLink.padEnd(61)} | ${discrepancyString.padStart(25)} | ${findersFeeString.padStart(17).padEnd(20)} | ${afterFeeString.padStart(19).padEnd(21)} |`
    );

    // dont include wagmi-studios in the total since they still owe @juicebox from previous bookkeeping error
    // https://docs.juicebox.money/dev/resources/post-mortem/2023-02-22/#wagmi
    if (projectId !== "387") {
      totalExcessFees += discrepancy;
      totalFindersFee += findersFee;
      totalAfterFee += afterFee;
    }
  });

  // Print total row
  console.log(
    `| ${" ".repeat(9)} | ${" ".repeat(30)}**TOTAL**${" ".repeat(22)} | ${formatEther(totalExcessFees).padStart(25)} | ${formatEther(totalFindersFee).padStart(17)} | ${formatEther(totalAfterFee).padStart(19)} |`
  );
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