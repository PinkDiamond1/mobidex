import BigNumber from 'bignumber.js';
import { addActiveTransactions, addAssets, addTransactions } from '../actions';
import {
  asyncTimingWrapper,
  cache,
  getAccount,
  getBalance,
  getTokenBalance,
  getZeroExClient,
  sendTokens as sendTokensUtil,
  sendEther as sendEtherUtil
} from '../utils';
import { gotoErrorScreen } from './navigation';

const getTokenBalanceWithTiming = asyncTimingWrapper(getTokenBalance);

export function updateActiveTransactionCache() {
  return async (dispatch, getState) => {
    const {
      wallet: { activeTransactions }
    } = getState();
    await cache(
      'transactions:active',
      async () => {
        return activeTransactions;
      },
      0
    );
  };
}

export function loadAssets(force = false) {
  return async (dispatch, getState) => {
    let {
      wallet: { web3, address },
      relayer: { tokens }
    } = getState();
    let assets = await cache(
      'assets',
      async () => {
        let balances = await Promise.all(
          tokens.map(({ address }) => getTokenBalanceWithTiming(web3, address))
        );
        let extendedTokens = tokens.map((token, index) => ({
          ...token,
          balance: balances[index]
        }));
        extendedTokens.push({
          address: null,
          symbol: 'ETH',
          name: 'Ether',
          decimals: 18,
          balance: await getBalance(web3, address)
        });
        return extendedTokens;
      },
      force ? 0 : 10 * 60
    );

    assets = assets.map(({ balance, ...token }) => ({
      ...token,
      balance: new BigNumber(balance)
    }));

    dispatch(addAssets(assets));
  };
}

export function loadTransactions(force = false) {
  return async (dispatch, getState) => {
    let {
      wallet: { address },
      settings: { network }
    } = getState();
    try {
      let transactions = await cache(
        'transactions',
        async () => {
          let options = {
            headers: {
              Accept: 'application/json',
              'Content-Type': 'application/json'
            }
          };
          let promises = [
            fetch(
              `https://mobidex.io/inf0x/${network}/fills?maker=${address}`,
              options
            ),
            fetch(
              `https://mobidex.io/inf0x/${network}/fills?taker=${address}`,
              options
            ),
            fetch(
              `https://mobidex.io/inf0x/${network}/cancels?maker=${address}`,
              options
            ),
            fetch(
              `https://mobidex.io/inf0x/${network}/cancels?taker=${address}`,
              options
            )
          ];
          let [makerFills, takerFills, makerCancels] = await Promise.all(
            promises
          );
          let makerFillsJSON = await makerFills.json();
          let takerFillsJSON = await takerFills.json();
          let makerCancelsJSON = await makerCancels.json();
          let filltxs = makerFillsJSON
            .map(log => ({
              ...log,
              id: log.transactionHash,
              status: 'FILLED'
            }))
            .concat(
              takerFillsJSON.map(log => ({
                ...log,
                id: log.transactionHash,
                status: 'FILLED'
              }))
            );
          let canceltxs = makerCancelsJSON.map(log => ({
            ...log,
            id: log.transactionHash,
            status: 'CANCELLED'
          }));

          return filltxs.concat(canceltxs);
        },
        force ? 0 : 10 * 60
      );
      dispatch(addTransactions(transactions));
    } catch (err) {
      dispatch(gotoErrorScreen(err));
    }
  };
}

export function loadActiveTransactions() {
  return async dispatch => {
    let transactions = await cache(
      'transactions:active',
      async () => {
        return [];
      },
      60 * 60 * 24 * 7
    );
    dispatch(addActiveTransactions(transactions));
    dispatch(updateActiveTransactionCache());
  };
}

export function sendTokens(token, to, amount) {
  return async (dispatch, getState) => {
    try {
      const {
        wallet: { web3, address }
      } = getState();
      let zeroEx = await getZeroExClient(web3);
      const txhash = await sendTokensUtil(web3, token, to, amount);
      const activeTransaction = {
        id: txhash,
        type: 'SEND_TOKENS',
        from: address,
        to,
        amount,
        token
      };
      dispatch(addActiveTransactions([activeTransaction]));
      dispatch(updateActiveTransactionCache());
    } catch (err) {
      dispatch(gotoErrorScreen(err));
    }
  };
}

export function sendEther(to, amount) {
  return async (dispatch, getState) => {
    try {
      const {
        wallet: { web3, address }
      } = getState();
      let zeroEx = await getZeroExClient(web3);
      const txhash = await sendEtherUtil(web3, to, amount);
      const activeTransaction = {
        id: txhash,
        type: 'SEND_ETHER',
        address,
        to,
        amount
      };
      dispatch(addActiveTransactions([activeTransaction]));
      dispatch(updateActiveTransactionCache());
    } catch (err) {
      dispatch(gotoErrorScreen(err));
    }
  };
}

export function setTokenAllowance(address) {
  return async (dispatch, getState) => {
    try {
      const {
        wallet: { web3 }
      } = getState();
      const zeroEx = await getZeroExClient(web3);
      const account = await getAccount(web3, address);
      const txhash = await zeroEx.token.setUnlimitedProxyAllowanceAsync(
        address,
        account
      );
      const activeTransaction = {
        id: txhash,
        type: 'ALLOWANCE',
        token: address,
        amount: 'UNLIMITED'
      };
      dispatch(addActiveTransactions([activeTransaction]));
      dispatch(updateActiveTransactionCache());
    } catch (err) {
      dispatch(gotoErrorScreen(err));
    }
  };
}
