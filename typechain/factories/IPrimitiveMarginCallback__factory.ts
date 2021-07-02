/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import { Contract, Signer } from "ethers";
import { Provider } from "@ethersproject/providers";

import type { IPrimitiveMarginCallback } from "../IPrimitiveMarginCallback";

export class IPrimitiveMarginCallback__factory {
  static connect(
    address: string,
    signerOrProvider: Signer | Provider
  ): IPrimitiveMarginCallback {
    return new Contract(
      address,
      _abi,
      signerOrProvider
    ) as IPrimitiveMarginCallback;
  }
}

const _abi = [
  {
    inputs: [
      {
        internalType: "uint256",
        name: "delRisky",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "delStable",
        type: "uint256",
      },
      {
        internalType: "bytes",
        name: "data",
        type: "bytes",
      },
    ],
    name: "depositCallback",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];
