import React, { Component } from 'react';
import * as PropTypes from 'prop-types';
import graphql from 'babel-plugin-relay/macro';
import { createFragmentContainer } from 'react-relay';
import {
  compose, insert, find, propEq,
} from 'ramda';
import { withStyles } from '@material-ui/core/styles';
import Typography from '@material-ui/core/Typography';
import IconButton from '@material-ui/core/IconButton';
import AppBar from '@material-ui/core/AppBar';
import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';
import { Close } from '@material-ui/icons';
import inject18n from '../../../components/i18n';
import { SubscriptionAvatars } from '../../../components/Subscription';
import GroupEditionOverview from './GroupEditionOverview';
import GroupEditionPermissions from './GroupEditionPermissions';

const styles = theme => ({
  header: {
    backgroundColor: theme.palette.navAlt.backgroundHeader,
    padding: '20px 20px 20px 60px',
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    left: 5,
  },
  importButton: {
    position: 'absolute',
    top: 15,
    right: 20,
  },
  container: {
    padding: '10px 20px 20px 20px',
  },
  appBar: {
    width: '100%',
    zIndex: theme.zIndex.drawer + 1,
    backgroundColor: theme.palette.navAlt.background,
    color: theme.palette.header.text,
    borderBottom: '1px solid #5c5c5c',
  },
  title: {
    float: 'left',
  },
});

class GroupEdition extends Component {
  constructor(props) {
    super(props);
    this.state = { currentTab: 0 };
  }

  handleChangeTab(event, value) {
    this.setState({ currentTab: value });
  }

  render() {
    const {
      t, classes, handleClose, group, me,
    } = this.props;
    const { editContext } = group;
    const missingMe = find(propEq('name', me.email))(editContext) === undefined;
    const editUsers = missingMe
      ? insert(0, { name: me.email }, editContext)
      : editContext;
    return (
      <div>
        <div className={classes.header}>
          <IconButton
            aria-label="Close"
            className={classes.closeButton}
            onClick={handleClose.bind(this)}
          >
            <Close fontSize="small" />
          </IconButton>
          <Typography variant="h6" classes={{ root: classes.title }}>
            {t('Update a group')}
          </Typography>
          <SubscriptionAvatars users={editUsers} />
          <div className="clearfix" />
        </div>
        <div className={classes.container}>
          <AppBar position="static" elevation={0} className={classes.appBar}>
            <Tabs
              value={this.state.currentTab}
              onChange={this.handleChangeTab.bind(this)}
            >
              <Tab label={t('Overview')} />
              <Tab label={t('Permissions')} />
            </Tabs>
          </AppBar>
          {this.state.currentTab === 0 && (
            <GroupEditionOverview
              group={this.props.group}
              editUsers={editUsers}
              me={me}
            />
          )}
          {this.state.currentTab === 1 && (
            <GroupEditionPermissions
              group={this.props.group}
              editUsers={editUsers}
              me={me}
            />
          )}
        </div>
      </div>
    );
  }
}

GroupEdition.propTypes = {
  handleClose: PropTypes.func,
  classes: PropTypes.object,
  group: PropTypes.object,
  me: PropTypes.object,
  theme: PropTypes.object,
  t: PropTypes.func,
};

const GroupEditionFragment = createFragmentContainer(GroupEdition, {
  group: graphql`
    fragment GroupEdition_group on Group {
      id
      ...GroupEditionOverview_group
      ...GroupEditionPermissions_group
      editContext {
        name
        focusOn
      }
    }
  `,
  me: graphql`
    fragment GroupEdition_me on User {
      email
    }
  `,
});

export default compose(
  inject18n,
  withStyles(styles, { withTheme: true }),
)(GroupEditionFragment);
