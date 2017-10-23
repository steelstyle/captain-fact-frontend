import React from "react"
import { connect } from "react-redux"
import { change } from 'redux-form'
import { List } from "immutable"
import classNames from 'classnames'

import { TimeSince } from "../Utils"
import { Icon } from "../Utils"
import { Source } from "./Source"
import UserAppellation from "../Users/UserAppellation"
import ModalFlag from './ModalFlag'
import ModalDeleteComment from './ModalDeleteComment'
import { translate } from 'react-i18next'
import { CommentsContainer } from './CommentsContainer'
import Tag from '../Utils/Tag'
import { addModal } from '../../state/modals/reducer'
import { commentVote, deleteComment, flagComment } from '../../state/video_debate/comments/effects'
import {flashErrorUnauthenticated} from '../../state/flashes/reducer'
import UserPicture from '../Users/UserPicture'
import { USER_PICTURE_MEDIUM } from '../../constants'
import MediaLayout from '../Utils/MediaLayout'


@connect(({CurrentUser, VideoDebate}, props) => ({
  currentUser: CurrentUser.data,
  myVote: VideoDebate.comments.voted.get(props.comment.id, 0),
  isVoting: VideoDebate.comments.voting.has(props.comment.id),
  replies: VideoDebate.comments.replies.get(props.comment.id),
  isFlagged: VideoDebate.comments.myFlags.has(props.comment.id) // TODO Selector
}), {addModal, deleteComment, flagComment, commentVote, change, flashErrorUnauthenticated})
@translate(['main', 'videoDebate'])
export class CommentDisplay extends React.PureComponent {
  constructor(props) {
    super(props)
    this.state = {isBlurred: false, showReplies: props.nesting !== 4}
    this.showRepliesToggle = this.showRepliesToggle.bind(this)

    // Authenticated actions
    this.vote = this.actionAuthenticated(this.vote.bind(this))
    this.actionReply = this.actionAuthenticated(this.actionReply.bind(this))
    this.handleFlag = this.actionAuthenticated(this.handleFlag.bind(this))
  }

  getRemoveOrFlag() {
    const { currentUser, comment, isFlagged, t } = this.props
    if (currentUser.id === comment.user.id)
      return (
        <a onClick={this.handleDelete.bind(this)}>
          <Icon name="times"/>
          <span> {t('actions.delete')}</span>
        </a>
      )
    else return (
      <a onClick={this.handleFlag}
         className={classNames('action-report', {selected: isFlagged})}>
        <Icon name="flag"/>
        <span> {t(isFlagged ? 'actions.flagged' : 'actions.flag')}</span>
      </a>
    )
  }

  handleDelete() {
    this.setState({isBlurred: true})
    this.props.addModal({
      Modal: ModalDeleteComment,
      props: {
        handleAbort: () => this.setState({isBlurred: false}),
        handleConfirm: () => this.props.deleteComment(this.props.comment),
        comment: this.props.comment
      }
    })
  }

  handleFlag() {
    this.setState({isBlurred: true})
    this.props.addModal({
      Modal: ModalFlag,
      props: {
        handleAbort: () => this.setState({isBlurred: false}),
        handleConfirm: ({reason}) => {
          this.setState({isBlurred: false})
          return this.props.flagComment({id: this.props.comment.id, reason: parseInt(reason)})
        },
        comment: this.props.comment
      }
    })
  }

  actionAuthenticated(func) {
    return args => {
      if (!this.props.currentUser.id)
        this.props.flashErrorUnauthenticated()
      else
        func(args)
    }
  }

  vote(value) {
    this.props.commentVote({comment: this.props.comment, value})
  }

  showRepliesToggle() {
    this.setState({showReplies: !this.state.showReplies})
  }

  actionReply() {
    const formName = `formAddComment-${this.props.comment.statement_id}`
    this.props.change(formName, 'reply_to', this.props.comment)
  }

  render() {
    const { user, text, source, score, inserted_at } = this.props.comment
    const { t, withoutActions, replyingTo, nesting, replies, myVote, isVoting, hideThread } = this.props
    return (
      <div>
        <MediaLayout
          className={classNames('comment', {isBlurred: this.state.isBlurred, hasSource: !!source})}
          ContainerType="article"
          left={
           <figure>
             {!withoutActions &&
             <div className="vote">
               <Icon name="chevron-up" isClickable={true}
                     className={classNames({ selected: myVote > 0 })}
                     onClick={() => myVote <= 0 ? this.vote(1) : this.vote(0)}/>
               <div className="score">
                 {isVoting ? <span className="round-spinner"/> : score}
               </div>
               <Icon name="chevron-down" isClickable={true}
                     className={classNames({ selected: myVote < 0 })}
                     onClick={() => myVote >= 0 ? this.vote(-1) : this.vote(0)}/>
             </div>
             }
             <UserPicture user={user} size={USER_PICTURE_MEDIUM}/>
           </figure>
          }
          content={
            <div className="content">
              <div>
                <div className="comment-header">
                  <UserAppellation user={user} withoutActions={withoutActions}/>
                  <span> - </span>
                  <TimeSince className="comment-time" time={inserted_at}/>
                </div>
                {source && <Source source={source}/>}
                <div className="comment-text">
                  {nesting > 4 && replyingTo &&
                  <Tag style={{marginRight: 5}}>@{replyingTo.username}</Tag>
                  }
                  { text }
                </div>
              </div>
              {!withoutActions &&
              <nav className="comment-actions">
                <a onClick={this.actionReply}>
                  <Icon size="small" name="reply"/>
                  <span> {t('actions.reply')}</span>
                </a>
                { this.getRemoveOrFlag() }
                { replies &&
                <a onClick={this.showRepliesToggle}>
                  <Icon size="small" name={this.state.showReplies ? "eye-slash" : "eye"}/>
                  <span> {t('videoDebate:comment.replies', {
                    context: this.state.showReplies ? 'hide' : 'show',
                    count: replies.size
                  })}
                    </span>
                </a>
                }
              </nav>
              }
            </div>
          }
        />
        {!hideThread && replies &&
          <CommentsContainer comments={this.state.showReplies ? replies : new List()}
                             nesting={nesting + 1}
                             replyingTo={user}/>
        }
      </div>
    )
  }
}
