import PropTypes from "prop-types";
import React from "react";
import FontAwesome from "react-native-vector-icons/FontAwesome";
import { connect } from "react-redux";
import { connect as connectNavigation } from "../../navigation";
import * as AssetService from "../../services/AssetService";
import * as WalletService from "../../services/WalletService";
import { approve } from "../../thunks";
import { navigationProp } from "../../types/props";
import { formatSymbol } from "../../utils";
import Button from "../components/Button";

class ActionOrUnlockButton extends React.Component {
  static propTypes = {
    assetData: PropTypes.string.isRequired,
    unlockProps: PropTypes.object.isRequired,
    dispatch: PropTypes.func.isRequired
  };

  render() {
    if (WalletService.isUnlockedByAssetData(this.props.assetData)) {
      return this.renderBuy();
    } else {
      return this.renderUnlock();
    }
  }

  renderBuy() {
    return <Button {...this.props} />;
  }

  renderUnlock() {
    const { assetData } = this.props;
    const assetOrWETH =
      assetData !== null
        ? AssetService.findAssetByData(assetData)
        : AssetService.getWETHAsset();

    return (
      <Button
        icon={<FontAwesome name="lock" size={20} color="white" />}
        title={`Unlock ${formatSymbol(assetOrWETH.symbol)}`}
        {...this.props}
        {...this.props.unlockProps}
        onPress={this.toggleApprove}
      />
    );
  }

  toggleApprove = () => {
    const { assetData } = this.props;
    const assetOrWETH =
      assetData !== null
        ? AssetService.findAssetByData(assetData)
        : AssetService.getWETHAsset();

    this.props.dispatch(
      approve(this.props.navigation.componentId, assetOrWETH.assetData)
    );
  };
}

export default connect(
  () => ({}),
  dispatch => ({ dispatch })
)(connectNavigation(ActionOrUnlockButton));
